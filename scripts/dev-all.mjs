import { spawn } from 'node:child_process'

const children = []

function startProcess(args, label) {
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm.cmd', ...args], {
          cwd: process.cwd(),
          stdio: 'inherit',
          shell: false,
          windowsHide: false,
        })
      : spawn('npm', args, {
          cwd: process.cwd(),
          stdio: 'inherit',
          shell: false,
        })

  children.push(child)

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${label}] exited with code ${code}`)
    }
  })

  return child
}

const api = startProcess(['run', 'api'], 'api')
const web = startProcess(['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4177', '--strictPort'], 'web')

function shutdown() {
  for (const child of children) {
    if (!child.killed) {
      child.kill()
    }
  }
}

process.on('SIGINT', () => {
  shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  shutdown()
  process.exit(0)
})

api.on('exit', () => {
  if (!web.killed) {
    web.kill()
  }
})

web.on('exit', () => {
  if (!api.killed) {
    api.kill()
  }
})
