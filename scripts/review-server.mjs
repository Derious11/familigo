// Local-only review server: no production configuration or cloud endpoints.
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
const server = await createServer({configFile:false,mode:'emulator',server:{host:'127.0.0.1',port:4180,strictPort:true},plugins:[react(),{
    name:'dedicated-review-emulators',enforce:'pre',transform(code,id){
        if (id.endsWith('/src/firebaseConfig.ts')) return code.replace("'http://127.0.0.1:9095'", "'http://127.0.0.1:9195'").replace("'127.0.0.1', 8085", "'127.0.0.1', 8185").replace("'127.0.0.1', 9195", "'127.0.0.1', 9295");
    },
}],define:{__FIREBASE_CONFIG__:JSON.stringify({projectId:'demo-familigo-review',apiKey:'demo-key',authDomain:'localhost',storageBucket:'demo-familigo-review.appspot.com',appId:'demo-review',messagingSenderId:'000000000000'})}});
await server.listen();server.printUrls();
