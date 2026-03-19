# SQLite 自动备份方案（Ubuntu）

## 适用范围

适用于当前演示版后端：

- Node.js
- SQLite
- Ubuntu 22 / 24

当前默认数据库文件：

```bash
~/QMVS/app/server/data/yijing-demo.sqlite
```

## 一、备份脚本

项目已内置备份脚本：

```bash
~/QMVS/app/scripts/sqlite-backup.mjs
```

也可以通过 `npm` 运行：

```bash
cd ~/QMVS/app
npm run backup:sqlite
```

默认行为：

- 读取 `API_DB_PATH`
- 在线执行 SQLite 安全备份
- 输出到 `server/backups/`
- 自动保留最近 `14` 份
- 为每个备份生成 `.sha256` 校验文件

## 二、手动执行一次

```bash
cd ~/QMVS/app
node scripts/sqlite-backup.mjs
```

成功后你会看到类似输出：

```json
{
  "status": "ok",
  "database": "/home/banlin/QMVS/app/server/data/yijing-demo.sqlite",
  "backupFile": "/home/banlin/QMVS/app/server/backups/yijing-demo-20260319-213000.sqlite",
  "checksumFile": "/home/banlin/QMVS/app/server/backups/yijing-demo-20260319-213000.sqlite.sha256",
  "keepCount": 14,
  "removed": []
}
```

查看备份文件：

```bash
ls -lh ~/QMVS/app/server/backups
```

## 三、建议的定时任务

建议每天凌晨 `02:30` 自动备份一次。

编辑当前用户的 `crontab`：

```bash
crontab -e
```

追加这一行：

```bash
30 2 * * * cd /home/banlin/QMVS/app && /usr/bin/node scripts/sqlite-backup.mjs >> /home/banlin/QMVS/app/server/backups/sqlite-backup.log 2>&1
```

保存后检查：

```bash
crontab -l
```

## 四、自定义保留份数

如果你想保留最近 `30` 份：

```bash
cd ~/QMVS/app
SQLITE_BACKUP_KEEP=30 node scripts/sqlite-backup.mjs
```

也可以写进 `crontab`：

```bash
30 2 * * * cd /home/banlin/QMVS/app && SQLITE_BACKUP_KEEP=30 /usr/bin/node scripts/sqlite-backup.mjs >> /home/banlin/QMVS/app/server/backups/sqlite-backup.log 2>&1
```

## 五、恢复方法

先停止后端：

```bash
pm2 stop yijing-demo-api
```

选择一个备份文件恢复：

```bash
cp ~/QMVS/app/server/backups/yijing-demo-20260319-213000.sqlite ~/QMVS/app/server/data/yijing-demo.sqlite
```

然后启动后端：

```bash
pm2 start yijing-demo-api
```

或者：

```bash
pm2 restart yijing-demo-api
```

## 六、校验备份是否可用

先进入备份目录：

```bash
cd ~/QMVS/app/server/backups
```

查看校验文件：

```bash
cat yijing-demo-20260319-213000.sqlite.sha256
```

重新计算 SHA256：

```bash
sha256sum yijing-demo-20260319-213000.sqlite
```

两者一致即可。

## 七、建议

- 至少保留最近 `14` 份
- 每次升级系统前手动再备份一次
- 每周手动抽查一次备份目录
- 如果后面改成 MySQL，需要重新设计备份方案
