import {createServer} from 'vite';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';

// Render the existing components once per build so first-paint copy and layout
// cannot drift from the interactive pages. No auth effects run during SSR.
export async function renderPublicPreviews(projectId: string) {
    const server = await createServer({
        configFile:false, appType:'custom',
        esbuild:{jsx:'automatic'}, optimizeDeps:{noDiscovery:true},
        define:{__FIREBASE_CONFIG__:JSON.stringify({projectId})},
        server:{middlewareMode:true,hmr:false,watch:null},
    });
    try {
        const render = async (name:string) => renderToStaticMarkup(createElement(
            (await server.ssrLoadModule('/src/pages/'+name+'.tsx')).default
        )).replace(/<link\b[^>]*rel="preload"[^>]*>/g,'');
        const home = await render('MarketingLanding');
        const login = await render('Login');
        // The preview has real navigation links. Controls that require React
        // appear only after mount; never show an editable throwaway login form.
        const homeHero = home.slice(0,home.indexOf('</section>')+'</section>'.length)+'</main></div>';
        const loginStory = login.slice(0,login.indexOf('</section>')+'</section>'.length)+'</main></div>';
        const css = (name:string) => readFileSync('src/pages/'+name+'.css','utf8');
        const template = readFileSync('src/pages/public-first-paint.html','utf8');
        return template.replace('<!-- home-content -->',()=>homeHero)
            .replace('<!-- login-content -->',()=>loginStory)
            .replace('/* shared-css */',()=>css('marketing-landing'))
            .replace('/* login-css */',()=>css('early-access')+css('login'));
    } finally { await server.close(); }
}
