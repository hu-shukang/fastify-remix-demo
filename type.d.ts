declare namespace NodeJS {
  interface ProcessEnv {
    ENV: 'local' | 'it' | 'st' | 'uat' | 'prod';
  }
}
