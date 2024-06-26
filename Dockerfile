FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
# RUN pnpm run --filter=documentation -r build
RUN pnpm deploy --filter=api --prod /prod/api
RUN pnpm deploy --filter=worker --prod /prod/worker

FROM base AS api
COPY --from=build /prod/api /prod/api
WORKDIR /prod/api
EXPOSE 8000
CMD [ "pnpm", "start" ]

FROM base AS worker
COPY --from=build /prod/worker /prod/worker
WORKDIR /prod/worker
EXPOSE 8001
CMD [ "pnpm", "start" ]

FROM base AS docs
COPY --from=build /usr/src/app /usr/src/app
WORKDIR /usr/src/app/packages/documentation
EXPOSE 5173
CMD [ "pnpm", "dev" ]
