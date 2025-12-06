import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { tools } from './tools';
import { callConfluenceWebhook } from './webhookService';
import { LogEntry } from '../types';

export class LiveClient {
  private ai: GoogleGenAI;
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;

  public onLog: (entry: LogEntry) => void = () => {};
  public onStatusChange: (status: string) => void = () => {};
  public onVolume: (volume: number) => void = () => {};

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect() {
    try {
      this.onStatusChange('connecting');
      
      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Request Microphone
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: 'You are a helpful Confluence Assistant. You can manage spaces and pages. When asked to perform an action, use the available tools. Be concise in your spoken responses. If a tool returns an error, explain it to the user.',
          tools: [{ functionDeclarations: tools }],
        },
      };

      const sessionPromise = this.ai.live.connect({
        model: config.model,
        config: config.config,
        callbacks: {
          onopen: () => {
            this.onStatusChange('connected');
            this.log('system', 'Connected to Gemini Live API');
            this.startAudioInput(sessionPromise);
          },
          onmessage: async (message: LiveServerMessage) => {
            await this.handleMessage(message, sessionPromise);
          },
          onclose: (e) => {
            this.onStatusChange('disconnected');
            this.log('system', 'Session closed');
          },
          onerror: (e) => {
            console.error(e);
            this.onStatusChange('error');
            this.log('system', 'Error occurred: ' + JSON.stringify(e));
          },
        }
      });

      this.session = sessionPromise; // Store promise to access session for sending data
      
    } catch (error: any) {
      console.error('Connection failed', error);
      this.onStatusChange('error');
      this.log('system', `Connection failed: ${error.message}. Please check your API key and network.`);
    }
  }

  private startAudioInput(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolume(rms);

      // Create blob and send
      const pcmBlob = this.createPcmBlob(inputData);
      sessionPromise.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      await this.playAudio(audioData);
    }

    // Capture Output Transcription (Incremental)
    const outputTranscript = message.serverContent?.outputTranscription?.text;
    if (outputTranscript) {
      this.log('model', outputTranscript);
    }

    // Capture Input Transcription (Incremental)
    const inputTranscript = message.serverContent?.inputTranscription?.text;
    if (inputTranscript) {
      this.log('user', inputTranscript);
    }

    // Handle Tool Calls
    if (message.toolCall) {
      this.handleToolCall(message.toolCall, sessionPromise);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.stopAudio();
      this.log('system', 'Interrupted');
    }
  }

  private async handleToolCall(toolCall: any, sessionPromise: Promise<any>) {
    for (const fc of toolCall.functionCalls) {
      this.log('tool-call', `Calling ${fc.name}...`, fc.args);
      
      // Call external Webhook service
      const result = await callConfluenceWebhook(fc.name, fc.args);
      
      this.log('tool-result', `Result from ${fc.name}`, result);

      // Send response back to model
      sessionPromise.then(session => {
        session.sendToolResponse({
          functionResponses: {
            id: fc.id,
            name: fc.name,
            response: { result: result },
          }
        });
      });
    }
  }

  private async playAudio(base64String: string) {
    if (!this.outputAudioContext) return;

    // Decode base64
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decode Audio
    const audioBuffer = await this.decodeAudioData(bytes, this.outputAudioContext);

    // Schedule playback
    this.nextStartTime = Math.max(this.outputAudioContext.currentTime, this.nextStartTime);
    
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.outputAudioContext.destination);
    
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
    };
  }

  private stopAudio() {
    this.sources.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  private createPcmBlob(data: Float32Array): { data: string, mimeType: string } {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768; // Clamp and scale
    }
    const bytes = new Uint8Array(int16.buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      data: btoa(binary),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const sampleRate = 24000;
    const numChannels = 1;
    const frameCount = dataInt16.length / numChannels;
    
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  public disconnect() {
    if (this.session) {
      // Cleanup logic if needed
    }
    this.stopAudio();
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.inputSource) {
      this.inputSource.disconnect();
      this.inputSource = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.onStatusChange('disconnected');
    this.log('system', 'Disconnected manually');
  }

  private log(type: LogEntry['type'], text: string, details?: any) {
    this.onLog({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type,
      text,
      details,
    });
  }
}
