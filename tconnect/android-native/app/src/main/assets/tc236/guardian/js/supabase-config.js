// T-Connect Supabase configuration
// Paste your Supabase Project URL and Publishable key here.
// Never put a service_role/secret key in this file.
window.TC_SUPABASE = {
  url: 'https://ygtvbczjolbaabqbhnxu.supabase.co',
  publishableKey: 'sb_publishable_Y6K_cRvVd_xnUSDG2lo89g_KEHVun5I',
  // Configure the public Child APK URL after hosting the signed APK.
  childApkUrl: '',
  // Optional public URL of the Child web/app entrypoint. Leave blank to use the current site.
  childInviteBaseUrl: '',
  // URL remoto do manifesto de atualização (preenchido pelo CI do GitHub).
  updateManifestUrl: ''
};

// Configuração WebRTC (câmara/áudio/projeção). STUN é grátis; para funcionar
// em dados móveis/NAT restritivo, acrescente um servidor TURN em iceServers.
window.TC_RTC = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'] }
    // ,{ urls:'turn:SEU_TURN:3478', username:'USUARIO', credential:'SENHA' }
  ]
};
