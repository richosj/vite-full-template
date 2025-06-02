import glob from 'fast-glob'
import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import handlebars from 'vite-plugin-handlebars'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const projectName = 'vite-full-template'

  // ✅ 무조건 상대경로 빌드 (절대경로 X)
  const basePath = './'

  // ✅ src 루트의 모든 .html 페이지 리스트
  const pagesPath = path.resolve(__dirname, 'src')
  const pageFiles = fs.readdirSync(pagesPath)
    .filter(file => file.endsWith('.html') && file !== 'link-page.html')

  // ✅ 각 페이지의 상단 메타데이터 읽기
  const pageMetaList = pageFiles.map(file => {
    const filePath = path.join(pagesPath, file)
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n').slice(0, 10)
    const meta = {}
    lines.forEach(line => {
      const match = line.match(/@(\w+)\s+(.+?)\s*-->/)
      if (match) {
        const [, key, value] = match
        meta[key] = value.trim()
      }
    })
    return {
      name: file,
      title: meta.pageTitle || path.basename(file, '.html'),
      note: meta.pageNote || '',
      created: meta.pageCreated || '',
      updated: meta.pageUpdated || ''
    }
  })

  return {
    root: 'src',
    base: basePath,
    publicDir: '../public',
    build: {
      outDir: '../dist',
      emptyOutDir: true,
      assetsInlineLimit: 0, // ✅ 작은 파일도 전부 파일로 출력!
      rollupOptions: {
        input: Object.fromEntries(
          glob.sync('src/*.html').map(file => {
            const name = path.basename(file, '.html')
            return [name, path.resolve(__dirname, file)]
          })
        ),
        output: {
          // ✅ js는 assets/js/로 정리
          entryFileNames: 'assets/js/[name].js',
          chunkFileNames: 'assets/js/[name].js',
          // ✅ css는 assets/css/로 정리
          assetFileNames: ({ name }) => {
            if (/\.(css)$/.test(name ?? '')) {
              return 'assets/css/[name][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|webp)$/.test(name ?? '')) {
              return 'assets/images/[name][extname]'
            }
            return 'assets/[name][extname]'
          }
        }
      },
      minify: mode === 'localbuild' ? false : 'esbuild'
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    plugins: [
      handlebars({
        partialDirectory: path.resolve(__dirname, 'src/components'),
        context: {
          pages: pageMetaList,
          cssPath: env.VITE_CSS_PATH
        }
      }),
      // ✅ 빌드 후 crossorigin 자동 제거 플러그인
      {
        name: 'remove-crossorigin',
        closeBundle() {
          const distPath = path.resolve(__dirname, 'dist')
          const htmlFiles = fs.readdirSync(distPath).filter(f => f.endsWith('.html'))

          htmlFiles.forEach(file => {
            const filePath = path.join(distPath, file)
            let content = fs.readFileSync(filePath, 'utf-8')
            content = content.replace(/ crossorigin/g, '') // crossorigin 삭제
            fs.writeFileSync(filePath, content)
          })

          console.log('✅ 빌드 후 crossorigin 속성 제거 완료')
        }
      }
    ],
  }
})
