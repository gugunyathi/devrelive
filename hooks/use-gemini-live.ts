import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export function useGeminiLive(channelName: string, initialContext?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);

  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextPlayTimeRef = useRef(0);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.then((session: any) => session.close?.());
      sessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API key is missing');
      }

      const ai = new GoogleGenAI({ apiKey });

      // Setup Audio Context for playback
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000, // Gemini outputs 24kHz audio
      });

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Setup recording context (16kHz for input)
      const recordContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      const source = recordContext.createMediaStreamSource(stream);
      const processor = recordContext.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = processor;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are an AI DevRel assistant for Base, working in the DevReLive call center. You are currently helping a developer with an issue related to ${channelName}. You can see their screen and hear their voice. Help them debug their code. Be concise, helpful, and technical. You have been trained on and should use the Base documentation from https://docs.base.org to resolve problems.`,
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);

            if (initialContext) {
              sessionPromise.then((session) => {
                session.sendClientContent({ turns: `I am calling about this thread:\n\n${initialContext}`, turnComplete: true });
              });
              setTranscript(prev => [...prev, { role: 'user', text: `[Automated Context Provided]\n${initialContext}` }]);
            }

            // Start sending audio
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              // Convert Float32 to Int16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                let s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Convert to base64
              const buffer = new ArrayBuffer(pcm16.length * 2);
              const view = new DataView(buffer);
              pcm16.forEach((val, i) => view.setInt16(i * 2, val, true));
              
              let binary = '';
              const bytes = new Uint8Array(buffer);
              for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
              }
              const base64Data = btoa(binary);

              sessionPromise.then((session) => {
                session.sendRealtimeInput({
                  media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
                });
              });
            };

            source.connect(processor);
            processor.connect(recordContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                // Handle audio output
                if (part.inlineData?.data) {
                  const base64Audio = part.inlineData.data;
                  const binaryString = atob(base64Audio);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  
                  // Decode PCM16 to Float32
                  const pcm16 = new Int16Array(bytes.buffer);
                  const float32 = new Float32Array(pcm16.length);
                  for (let i = 0; i < pcm16.length; i++) {
                    float32[i] = pcm16[i] / 32768.0;
                  }

                  playAudio(float32);
                }

                // Handle transcription
                if (part.text) {
                  setTranscript(prev => [...prev, { role: 'ai', text: part.text as string }]);
                }
              }
            }
            
            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextPlayTimeRef.current = audioContextRef.current?.currentTime || 0;
            }
          },
          onerror: (err) => {
            console.error('Gemini Live error:', err);
            setError('Connection error occurred.');
            disconnect();
          },
          onclose: () => {
            disconnect();
          },
        },
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error('Failed to connect:', err);
      setError(err.message || 'Failed to connect');
      setIsConnecting(false);
    }
  }, [channelName, disconnect, initialContext]);

  const playAudio = (audioData: Float32Array) => {
    if (!audioContextRef.current) return;
    
    const audioCtx = audioContextRef.current;
    const buffer = audioCtx.createBuffer(1, audioData.length, 24000);
    buffer.copyToChannel(audioData as any, 0);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    const currentTime = audioCtx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += buffer.duration;
  };

  const sendScreenFrame = useCallback(async (base64Jpeg: string) => {
    if (!sessionRef.current || !isConnected) return;
    
    try {
      const session = await sessionRef.current;
      session.sendRealtimeInput({
        media: { data: base64Jpeg, mimeType: 'image/jpeg' },
      });
    } catch (err) {
      console.error('Failed to send screen frame:', err);
    }
  }, [isConnected]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!sessionRef.current || !isConnected) return;
    
    try {
      setTranscript(prev => [...prev, { role: 'user', text }]);
      const session = await sessionRef.current;
      session.sendClientContent({ turns: text, turnComplete: true });
    } catch (err) {
      console.error('Failed to send text message:', err);
    }
  }, [isConnected]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    error,
    transcript,
    connect,
    disconnect,
    sendScreenFrame,
    sendTextMessage,
  };
}
