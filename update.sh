#!/bin/sh

CUR=$(pwd)

CURRENT=$(cd "$(dirname "$0")" || exit;pwd)
echo "${CURRENT}"

cd "${CURRENT}" || exit
git pull --prune
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi
echo ""
pwd

if ! (disable-checkout-persist-credentials && pnx pnpm@latest self-update && pnpm install && pnpm up -r && pnpm audit --fix override && pnpm up -r && pnpm -r --if-present --parallel build && pnpm -r --if-present --parallel lint-fix && pnpm -r --if-present --parallel build && pnpm install -r --no-frozen-lockfile); then
  cd "${CUR}" || exit
  exit 1
fi
git commit -am "Bumps node modules" && git push
result=$?
if [ $result -ne 0 ]; then
  cd "${CUR}" || exit
  exit $result
fi

cd "${CUR}" || exit
