import { spawn } from 'node:child_process'

const cwd = process.cwd()
const webPort = process.env.BROWSER_WEB_PORT ?? '4178'
const webHost = process.env.BROWSER_WEB_HOST ?? '127.0.0.1'
const apiPort = process.env.BROWSER_API_PORT ?? '8797'

const env = {
  ...process.env,
  VITE_API_BASE_URL: `http://${webHost}:${apiPort}`,
}

const child =
  process.platform === 'win32'
    ? spawn(
        'cmd.exe',
        ['/d', '/s', '/c', 'npm.cmd', 'run', 'dev', '--', '--host', webHost, '--port', webPort, '--strictPort'],
        {
          cwd,
          stdio: 'inherit',
          shell: false,
          windowsHide: false,
          env,
        },
      )
    : spawn('npm', ['run', 'dev', '--', '--host', webHost, '--port', webPort, '--strictPort'], {
        cwd,
        stdio: 'inherit',
        shell: false,
        env,
      })

child.on('exit', (code) => {
  process.exit(code ?? 0)
})

process.on('SIGINT', () => {
  child.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  child.kill()
  process.exit(0)
})
