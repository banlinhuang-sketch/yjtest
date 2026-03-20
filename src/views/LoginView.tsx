import { useMemo, useState } from 'react'

import { Icon } from '../components/Icon.tsx'
import './LoginView.css'

interface LoginViewProps {
  isSubmitting: boolean
  errorMessage: string | null
  onLogin: (credentials: { username: string; password: string }) => Promise<void>
}

const demoAccount = {
  username: 'banlin.huang',
  password: 'Yijing@2026',
}

export function LoginView({
  isSubmitting,
  errorMessage,
  onLogin,
}: LoginViewProps) {
  const [username, setUsername] = useState(demoAccount.username)
  const [password, setPassword] = useState(demoAccount.password)

  const canSubmit = useMemo(
    () => username.trim().length > 0 && password.trim().length > 0 && !isSubmitting,
    [isSubmitting, password, username],
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    await onLogin({
      username: username.trim(),
      password: password.trim(),
    })
  }

  async function handleUseDemo() {
    if (isSubmitting) {
      return
    }

    setUsername(demoAccount.username)
    setPassword(demoAccount.password)

    await onLogin(demoAccount)
  }

  return (
    <div className="login-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <div className="login-brand">
          <div className="login-brand-mark">
            <Icon name="dataset" />
          </div>
          <div>
            <strong>亿境测试部</strong>
            <span>测试用例管理平台</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="login-badge">P0 登录页</span>
          <h1>登录进入统一测试工作台</h1>
          <p>
            一期接入真实本地后端接口，当前使用账号密码登录。登录成功后会自动校验会话、拉取真实用例列表，并进入
            P1-P6 工作流。
          </p>
        </div>

        <div className="login-form-grid">
          <label className="login-field">
            <span>账号</span>
            <input
              type="text"
              data-testid="login-username-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入账号"
              autoComplete="username"
            />
          </label>

          <label className="login-field">
            <span>密码</span>
            <input
              type="password"
              data-testid="login-password-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </label>
        </div>

        {errorMessage ? (
          <div className="login-error-banner" role="alert">
            <Icon name="error" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        <div className="login-actions">
          <button className="login-primary-button" type="submit" data-testid="login-submit-button" disabled={!canSubmit}>
            {isSubmitting ? <span className="login-button-spinner" aria-hidden="true" /> : <Icon name="login" />}
            {isSubmitting ? '登录中...' : '登录进入平台'}
          </button>

          <button className="login-secondary-button" type="button" data-testid="login-demo-button" disabled={isSubmitting} onClick={handleUseDemo}>
            {isSubmitting ? (
              <span className="login-button-spinner secondary" aria-hidden="true" />
            ) : (
              <Icon name="verified_user" />
            )}
            {isSubmitting ? '演示账号登录中...' : '使用演示账号'}
          </button>
        </div>

        <div className="login-help">
          <div>
            <strong>演示账号</strong>
            <p>
              账号：<code>{demoAccount.username}</code>
              <br />
              密码：<code>{demoAccount.password}</code>
            </p>
          </div>
          <a href="mailto:test-platform@yijing.local">联系平台管理员</a>
        </div>
      </form>
    </div>
  )
}
