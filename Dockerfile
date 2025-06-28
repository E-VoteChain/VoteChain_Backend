# Use Node 23 Alpine image
FROM node:23-alpine as builder
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/usr/src/app/.npm \
    npm set cache /usr/src/app/.npm && npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

FROM node:23-alpine as runner
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app .

COPY .env ./

EXPOSE 3000

CMD ["npm", "start"]
