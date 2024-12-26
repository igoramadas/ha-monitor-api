# HA-MONITOR-API

FROM node:22-alpine
WORKDIR /app
COPY . ./
EXPOSE 9999
ENV NODE_ENV=production
RUN npm install --omit=dev
CMD ["npm", "start"]
