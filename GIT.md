# 自己动手 git（本站专用速查）

这份文档只为**这一个仓库**服务，所有命令都在你机器上实测过。
日常就三件事：**看改了什么 → 记一笔 → 推上去**。

---

## 0. 先记住三条铁律

1. **只在 `D:\Blog\A-Blog` 里敲 git**。别在别的目录敲，否则会改错仓库。
2. **只推 `Alokiria` 分支**（这是本站的默认分支，不是 `main`）。
3. **推完就等于发布了**。Cloudflare Pages 会监听 `Alokiria`，你一 push，它自动重新构建上线。

---

## 1. 日常三步（90% 的情况只用这三条）

```powershell
# ① 看现在有哪些改动
git status -s -b

# ② 全部记一笔（写清楚你干了什么）
git add -A
git commit -m "docs: 新增 Shader 第 8-11 章"

# ③ 推上去
git push -u origin Alokiria
```

就这三条。下面全是「出问题时怎么办」。

> **关于第 ③ 步的 `-u origin Alokiria`**：`-u` 是「记住推到哪里」，**只有第一次需要带**。
> 带上它之后，以后直接 `git push` 就行，而且 `git status` 还会告诉你「领先/落后远端几个提交」。
> 之所以特意让你第一次就带上，是因为这个仓库的本地分支**默认没有关联上游**——
> 不带的话裸敲 `git push` 可能提示「当前分支没有上游」，推不出去。
>
> 不确定有没有关联过？看 `git branch -vv`：有 `[origin/Alokiria]` 就是关联好了，
> 没有的话补一次 `git push -u origin Alokiria` 即可。

> `git commit -m "..."` 里的引号内容是**提交说明**，随便写，但建议带上前缀好翻历史：
> `feat:` 新功能 · `fix:` 修 bug · `docs:` 文章/文档 · `style:` 只调样式 · `refactor:` 重构 · `chore:` 杂项

### 只想提交部分文件

```powershell
git add pages/posts/Shader入门精要URP重置/UnityShader-Chapter8.md
git commit -m "docs: 新增第 8 章"
```

其余改动会留在工作区，下次再提交。

---

## 2. 先看再提交（推荐养成习惯）

```powershell
git status -s -b          # 哪些文件改了（M=改过，??=新文件，D=删了）
git diff                  # 具体改了什么内容
git diff --stat           # 只统计每个文件改了几行
git log --oneline -10     # 最近 10 条提交
```

---

## 3. ⚠️ 这台机器上的两个特殊设置（已经配好了，别删）

| 设置 | 值 | 为什么 |
| --- | --- | --- |
| `http.sslBackend` | `schannel` | 你的代理软件会拦截 HTTPS，git 默认的 `openssl` 后端不读 Windows 证书库，会报 `SSL certificate ... unable to get local issuer certificate`。`schannel` 走 Windows 证书库就正常了 |
| `credential.helper` | `manager` | 记住你的 GitHub 登录，第一次登录过之后就不用再登 |

检查它们还在不在：

```powershell
git config --get http.sslBackend
```

如果**没输出**（空），补上：

```powershell
git config http.sslBackend schannel
```

> ⚠️ **不要**用 `git config --global` —— 那会影响你所有仓库。上面这条不带 `--global`，只作用于本站，正是我们要的。

---

## 4. 推送失败怎么办（按错误信息对号入座）

### ① `Connection was reset` / `Failed to connect ... port 443`

网络抖动（国内直连 GitHub 常见）。**先确认代理软件开着**（Clash Verge 在运行、系统代理开着），然后重试几次即可：

```powershell
git push
# 失败就再敲一次，通常第二次或第三次就过
```

### ② `SSL certificate ... unable to get local issuer certificate`

见上面第 3 节，补 `git config http.sslBackend schannel`。

### ③ `! [rejected] ... (fetch first)` 或 `(non-fast-forward)`

说明**远端有你本地没有的提交**——多半是你在 GitHub 网页上直接改过东西（比如网页版改文章、传文件）。**不要强推**，先同步再推：

```powershell
git fetch origin
git rebase origin/Alokiria   # 把你的提交搬到远端最新提交之后
git push
```

`rebase` 如果弹出编辑器要求写信息，直接保存关闭即可（`:wq`）。
如果提示**冲突**（`CONFLICT`），说明同一处两边都改了，看下面第 6 节。

### ④ `Author identity unknown` / 提示要配置 user.name

```powershell
git config user.name "Alokiria"
git config user.email "jyh752038321@outlook.com"
```

---

## 5. 发布流程（重要的坑都在这）

**推送到 `Alokiria` 后，Cloudflare Pages 会自动构建上线**，你不用手动做任何事。
但下面几条是踩过的坑，弄错会导致「推上去了但线上坏了/构建失败」：

### ✅ 必须用 `npm run build`，不要直接跑 `valaxy build --ssg`

```powershell
npm run build     # 正确：末尾会跑 scripts/decode-dist-paths.mjs
```

构建链里那一步是**必须的**：SSG 落盘的文件名是百分号编码的（`Godot%E5%A4%A7...`），
而托管平台找文件前会先解一次码，中文目录的文章页就会 404。
`decode-dist-paths.mjs` 负责把 dist 里的文件名还原成中文。绕开它就会重演这个 bug。

### ❌ 不要往仓库里加 pnpm 的锁文件

不要创建/提交 `pnpm-lock.yaml`、`pnpm-workspace.yaml`。
Cloudflare 是**按锁文件自动认包管理器**的：一旦看到 `pnpm-lock.yaml`，它就会改用
`pnpm install --frozen-lockfile`，只要锁文件没跟上 `package.json`，构建会直接失败
（`ERR_PNPM_OUTDATED_LOCKFILE`）。本项目**只用 npm**，`package-lock.json` 才是准的。

加了依赖之后（`npm install xxx`），记得把 `package.json` 和 `package-lock.json` **一起提交**，
否则 `npm ci` 会因为两者不一致而失败。

### ❌ 不要在 `package.json` 里写 `"packageManager": "npm@11"`

这种只写主版本号的写法是非法的（必须是完整 semver 如 `npm@11.6.2`），
Cloudflare 会在读取 `package.json` 阶段就直接失败。

### 📌 发文章

文章放 `pages/posts/` 下，Markdown 头部必须有 frontmatter：

```markdown
---
title: '文章标题'
date: 2026-10-03
categories: Godot大学习
tags:
  - Godot
---
```

`.valaxy/route-map.d.ts` 是构建自动生成的路由声明，跟着提交就行，不用手动改。

---

## 6. 出事了怎么退

### 提交信息写错了（还没推）

```powershell
git commit --amend -m "新的说明"
```

### 提交错了（还没推），想撤销但保留改动

```powershell
git reset --soft HEAD~1     # 撤销最近 1 次提交，改动回到暂存区
git status -s -b
```

### 改坏了某个文件，想扔掉这次修改

```powershell
git restore 文件路径          # 例：git restore README.md
```

⚠️ 这条**会永久丢掉**该文件未提交的改动，用前先用 `git diff 文件路径` 看一眼。

### 想看看现在跟远端差多少

```powershell
git fetch origin
git log --oneline origin/Alokiria..HEAD    # 本地比远端多出来的提交
git log --oneline HEAD..origin/Alokiria    # 远端比你多出来的提交
```

> ⚠️ `origin/Alokiria` 是**上次成功 fetch 时的快照**，不是实时状态。
> 如果 `git fetch origin` 报了网络错（`Connection was reset`），那这两个对比出来的结果是**旧的、会骗人**。
> 所以要用这个判断前，先确认 fetch 真的成功了（没报错）。

### 冲突（rebase 时提示 CONFLICT）

```powershell
git status -s -b            # 会列出「both modified」的文件
# 手动打开那些文件，搜索 <<<<<<< 、======= 、>>>>>>> 三行标记，
# 留下你要的内容，把这三行标记删掉，保存。
git add -A
git rebase --continue
```

想放弃这次 rebase、回到原样：

```powershell
git rebase --abort
```

---

## 7. 记忆卡片

| 我想干什么 | 命令 |
| --- | --- |
| 看有什么改动 | `git status -s -b` |
| 看我改了什么内容 | `git diff` |
| 记一笔 | `git add -A` + `git commit -m "说明"` |
| 推上去发布 | `git push`（第一次用 `git push -u origin Alokiria`） |
| 确认推送关联好了没 | `git branch -vv`（看有没有 `[origin/Alokiria]`） |
| 拉远端最新（不动我的改动） | `git fetch origin` |
| 把我的提交接到远端之后 | `git rebase origin/Alokiria` |
| 推送被拒 | 先 `git fetch` → `git rebase origin/Alokiria` → `git push` |
| 网络报错 | 确认代理开着，重复 `git push` |
| 证书报错 | `git config http.sslBackend schannel` |
| 看历史 | `git log --oneline -10` |
| 撤销未推送的提交（留改动） | `git reset --soft HEAD~1` |
| 扔掉某文件的未提交改动 | `git restore 文件路径` |

---

## 8. 千万别做

| 别做 | 原因 |
| --- | --- |
| `git push --force` / `-f` | 会**抹掉远端别人的提交**，无法恢复。远端有你的提交时也白推。 |
| 直接推 `main` 分支 | 本站默认分支是 `Alokiria`，推 `main` 等于新建一条没人看的线。 |
| 把 `node_modules/`、`dist/` 提交上去 | 已在 `.gitignore` 里忽略，别用 `git add -f` 强加，会让仓库爆掉。 |
| 提交 `.env`、token、密钥 | 一旦推上 GitHub 就**算泄露**（即使之后删掉，历史里还在），只能去平台作废重发。 |
| `git reset --hard` | 会**永久丢掉**所有未提交改动。 |

---

## 附：这个仓库现在的样子

- 本地路径：`D:\Blog\A-Blog`
- 远端：`https://github.com/Alokiria/A-Blog`
- 分支：`Alokiria`（已用 `git push -u` 关联到 `origin/Alokiria`，所以 `git push` 不用带参数）
- 部署：Cloudflare Pages，监听 `Alokiria`，push 即自动构建
- 线上地址：<https://www.alokiria.top/>
