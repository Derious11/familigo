import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  };
  for (const [key, value] of Object.entries(firebaseConfig)) {
    if (key !== 'measurementId' && !value) {
      throw new Error(`Missing Firebase ${key} configuration for ${mode}.`);
    }
  }
  if (mode === 'development' && firebaseConfig.projectId !== 'familigo-dev-11643') {
    throw new Error('Development must use the familigo-dev-11643 Firebase project.');
  }
  const workerConfig = `self.FIREBASE_CONFIG = ${JSON.stringify(firebaseConfig)};`;
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), {
      name: 'firebase-worker-config',
      configureServer(server) {
        server.middlewares.use('/firebase-runtime-config.js', (_req, res) => {
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-store');
          res.end(workerConfig);
        });
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'firebase-runtime-config.js', source: workerConfig });
      },
    }],
    define: {
      '__FIREBASE_CONFIG__': JSON.stringify(firebaseConfig),
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          }
        }
      }
    }
  };
});
