// C:\Projects\Setoriza\frontend\src\services\notification.ts
// Utilitário de Notificações Sonoras e Desktop para o Setoriza

let audioCtx: AudioContext | null = null;
let titleFlashInterval: any = null;
const originalTitle = document.title || 'Setoriza';

/**
 * Toca um som de notificação curto e premium (chime em dois tons com rampa de sweep)
 * Utiliza a API de Áudio do próprio navegador (Web Audio API) dispensando arquivos de mídia externos.
 */
export const playNotificationSound = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    
    // Oscilador 1 (Tom base - sweep ascendente sutil de E5 para A5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // Nota E5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // Nota A5 (sweep de subida)
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.12, now + 0.02); // Ataque rápido
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35); // Decaimento suave

    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    // Oscilador 2 (Harmônico agudo - C#6)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, now); // Nota C#6
    
    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.06, now + 0.04);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    // Inicia e para os sons
    osc1.start(now);
    osc1.stop(now + 0.40);
    
    osc2.start(now);
    osc2.stop(now + 0.40);
  } catch (error) {
    console.warn('Falha ao reproduzir áudio de notificação:', error);
  }
};

/**
 * Solicita permissão para exibir notificações de área de trabalho no navegador.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

/**
 * Alterna dinamicamente o título da aba para chamar atenção do usuário (piscar aba)
 */
export const startTitleFlash = (message: string) => {
  if (titleFlashInterval) clearInterval(titleFlashInterval);
  
  let isOriginal = false;
  titleFlashInterval = setInterval(() => {
    document.title = isOriginal ? originalTitle : message;
    isOriginal = !isOriginal;
  }, 1200);

  // Para de piscar quando o usuário focar na janela do sistema
  const stopFlash = () => {
    clearInterval(titleFlashInterval);
    titleFlashInterval = null;
    document.title = originalTitle;
    window.removeEventListener('focus', stopFlash);
    window.removeEventListener('click', stopFlash);
  };
  window.addEventListener('focus', stopFlash);
  window.addEventListener('click', stopFlash);
};

/**
 * Exibe uma notificação do sistema (estilo banner do SO) caso o navegador esteja minimizado ou desfocado.
 */
export const showDesktopNotification = (title: string, body: string, onClick?: () => void) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Não exibe se o usuário já estiver ativamente visualizando o sistema
  if (document.visibilityState === 'visible') {
    if (document.hasFocus()) {
      return;
    }
  }

  try {
    const notification = new Notification(title, {
      body,
      tag: 'setoriza-new-message',
      icon: '/favicon.ico',
      requireInteraction: false
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (error) {
    console.error('Falha ao exibir notificação de área de trabalho:', error);
  }
};
