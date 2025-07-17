FROM node:20

WORKDIR /app

# 拷贝项目文件
COPY . .

# 安装依赖
RUN npm install

# 构建 TypeScript
RUN npm run build

# 设置环境变量（可选，建议用 docker run -e 传递）
# ENV JIRA_HOST=your-jira-host.atlassian.net
# ENV JIRA_EMAIL=your-email@example.com
# ENV JIRA_API_TOKEN=your-api-token

# 入口：用 stdio 启动 MCP Server
ENTRYPOINT ["node", "dist/index.js"]