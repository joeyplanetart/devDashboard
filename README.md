# devDashboard

本地开发服务仪表盘：在一个桌面窗口里启动 / 重启 / 停止项目，查看端口、入口地址和实时终端日志。

界面参考 Codex 桌面端：深色双栏、窄侧栏服务列表、主区域详情 + 日志控制台。

## 功能

- **进程管理**：启动、重启、停止；退出应用时自动清理所有托管的子进程（含子进程树）
- **端口与入口**：显示 `http://localhost:<port>`，一键复制 / 浏览器打开；未配置端口时从日志自动识别
- **端口冲突**：启动前检测占用，失败时给出占用进程名和 PID；启动后冲突（`EADDRINUSE`）同样会解析出来
- **失败原因**：工作目录不存在、命令不可用、依赖缺失、权限不足、启动超时、非 0 退出码，并附 stderr 末尾内容
- **实时日志**：stdout / stderr 分流着色、按 100ms 批量推送、最多保留 5000 行；支持过滤、只看错误、自动滚动、复制、清空
- **配置管理**：手动添加 / 编辑应用，或扫描目录自动识别 `package.json` 中的 `dev` / `start` / `serve` 脚本
- **随应用启动**：可为单个服务开启 autoStart

## 技术栈

- [Electrobun 2](https://electrobun.dev)：主进程运行在 Bun 上，渲染使用系统 WebView（macOS 为 WKWebView）
- React 18 + Vite + Tailwind CSS 3 + TypeScript
- 构建 / 运行由 Hutch 驱动（Electrobun 官方 CLI）

## 环境要求

- macOS 14+
- [Bun](https://bun.sh) 1.4+
- Hutch：`curl -fsSL https://hutch.blackboard.sh/hutch/install.sh | sh`

## 开发

```bash
hutch run install   # 安装依赖（首次）
hutch run dev       # 构建前端并启动桌面应用
hutch run dev:hmr   # 带 Vite HMR 的开发模式
```

也可以使用启动脚本（自动补齐 `~/.hutch/bin` 到 PATH、首次运行自动安装依赖）：

```bash
./start.sh          # dev
./start.sh hmr      # HMR
./start.sh build    # 打包
```

## 打包

```bash
hutch run build         # 稳定版
hutch run build:canary  # 预览版
```

产物位于 `build/` 与 `artifacts/`。

## 应用图标

图标源文件是 `assets/icon.svg`：近黑圆角底板 + 白色终端提示符 + 绿色光标（表示运行中的服务）。

修改 SVG 后重新生成各尺寸资源：

```bash
./scripts/build-icon.sh
```

会输出 `icon.iconset/`（macOS，10 个尺寸）和 `assets/icon.png`（Windows / Linux，1024px），并用 `iconutil` 校验。

## 项目结构

```
src/
├── shared/types.ts          # 主进程 / 渲染进程共享类型与 RPC schema
├── bun/
│   ├── index.ts             # 窗口入口，装配 RPC 与进程管理
│   ├── rpc.ts               # typed RPC handlers
│   ├── process-manager.ts   # 启动/停止/重启、状态机、日志批次、失败解析
│   ├── ports.ts             # 端口占用检测、URL/端口识别
│   ├── scanner.ts           # 扫描目录生成导入候选
│   ├── config.ts            # apps.json 读写
│   └── logs.ts              # 环形日志缓冲
└── mainview/
    ├── App.tsx              # 布局与状态编排
    ├── rpc.ts               # Electroview RPC 客户端
    ├── hooks/useDashboard.ts
    └── components/          # Sidebar / AppHeader / PortPanel / LogConsole / 弹层
```

## 配置位置

应用配置写入：

```
~/Library/Application Support/com.joey.devdashboard/dev/apps.json   # 开发模式
~/Library/Application Support/com.joey.devdashboard/devDashboard/apps.json  # 打包后
```

日志只保存在内存中，重启应用后清空。

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `⌘ Enter` | 启动 / 重启当前应用 |
| `⌘ .` | 停止当前应用 |

## 说明

- 进程通过登录 shell（`$SHELL -lc`）执行，因此 `nvm`、`bun` 等 PATH 配置可用
- 停止时先向进程树发 `SIGTERM`，4 秒后仍未退出则 `SIGKILL`
- 日志中的 ANSI 颜色码会被剥离，按 stdout / stderr 着色
