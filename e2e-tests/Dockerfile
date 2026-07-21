FROM mcr.microsoft.com/playwright:v1.61.1-noble

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package descriptors
COPY package.json ./
RUN pnpm install

# Copy source code files
COPY tsconfig.json cucumber.js report_generator.js ./
COPY steps/ ./steps/
COPY helpers/ ./helpers/
COPY features/ ./features/

# Command to run tests and compile reports
CMD ["pnpm", "test"]
