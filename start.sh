#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

# Hutch 通常安装在 ~/.hutch/bin，保证从 IDE / Finder 启动时也能找到
export PATH="$HOME/.hutch/bin:$PATH"

usage() {
	cat <<'EOF'
用法: ./start.sh [dev|hmr|build]

  dev    构建前端并启动桌面应用（默认）
  hmr    启动 Vite HMR 模式，改前端即时生效
  build  打包稳定版到 build/ 与 artifacts/

示例:
  ./start.sh
  ./start.sh hmr
EOF
}

die() {
	echo "错误: $*" >&2
	exit 1
}

MODE="${1:-dev}"

if [[ "$MODE" == "-h" || "$MODE" == "--help" ]]; then
	usage
	exit 0
fi

command -v hutch >/dev/null 2>&1 || die "未找到 hutch，请先安装：
  curl -fsSL https://hutch.blackboard.sh/hutch/install.sh | sh
  安装后重开终端，或执行 export PATH=\"\$HOME/.hutch/bin:\$PATH\""

command -v bun >/dev/null 2>&1 || die "未找到 bun，请先安装：https://bun.sh"

if [[ ! -d node_modules ]]; then
	echo "→ 首次运行，安装依赖…"
	hutch run install
fi

case "$MODE" in
	dev)
		echo "→ 启动 devDashboard（dev）"
		exec hutch run dev
		;;
	hmr)
		echo "→ 启动 devDashboard（HMR）"
		exec hutch run dev:hmr
		;;
	build)
		echo "→ 打包 devDashboard（stable）"
		exec hutch run build
		;;
	*)
		echo "未知模式: $MODE" >&2
		usage
		exit 1
		;;
esac
