import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function injectLLMKeysPlugin() {
  return {
    name: 'inject-llm-keys-in-html',
    transformIndexHtml(html: string, ctx: any) {
      const mode = (ctx && ctx.mode) ? ctx.mode : (process?.env?.NODE_ENV || 'development');
      const env = loadEnv(mode, process.cwd(), 'VITE_');
      const oai = JSON.stringify(env.VITE_OPENAI_API_KEY || '');
      const gem = JSON.stringify(env.VITE_GEMINI_API_KEY || '');
      const ant = JSON.stringify(env.VITE_ANTHROPIC_API_KEY || '');
      const snippet = [
        '<script>',
        '(function(){',
        '  try {',
        '    if (!window.__ENV_OPENAI_API_KEY) window.__ENV_OPENAI_API_KEY = ' + oai + ';',
        '    if (!window.__ENV_GEMINI_API_KEY) window.__ENV_GEMINI_API_KEY = ' + gem + ';',
        '    if (!window.__ENV_ANTHROPIC_API_KEY) window.__ENV_ANTHROPIC_API_KEY = ' + ant + ';',
        '  } catch (e) {}',
        '})();',
        '</script>',
      ].join('');
      return html.replace('<body>', '<body>\n    ' + snippet + '\n');
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), tailwindcss(), injectLLMKeysPlugin()],
}))
