FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
# El lockfile tiene un conflicto de peers conocido: requiere --legacy-peer-deps.
RUN npm ci --legacy-peer-deps
COPY . .
# NEXT_PUBLIC_* se fija en build. Las URL de Supabase son placeholder: nunca se usan sin sesion real.
ARG NEXT_PUBLIC_AUTH_MODE=supabase
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder
ENV NEXT_PUBLIC_AUTH_MODE=$NEXT_PUBLIC_AUTH_MODE \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
