FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files first (for cached installs)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the entire project
COPY . .

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 5000

# Start app in production mode
CMD ["npm", "start"]


# # Step 1: Build the Next.js app
# FROM node:20-alpine AS builder

# # Install Git (required for npm install if dependencies use Git)
# RUN apk add --no-cache git

# WORKDIR /app

# # Copy package files
# COPY package.json ./

# #Add cache busting for npm install
# ARG CACHE_BUST_CHECKING
# RUN echo "dev new bust: $CACHE_BUST_CHECKING"

# #Clean cache and install all dependencies
# RUN npm cache clean --force
# RUN npm install --legacy-peer-deps --force

# #Verify api-types is installed correctly
# RUN npm list api-types
# RUN ls -la node_modules/api-types/

# # Copy the rest of the application code
# COPY . .

# # Build the Next.js application
# RUN npm run build

# # Step 2: Prepare the production image
# FROM node:20-alpine

# ENV NEXT_TELEMETRY_DISABLED=1

# WORKDIR /app

# # Copy the built app from the builder stage
# COPY --from=builder /app ./

# # # Install only production dependencies
# # RUN npm install --only=production --no-cache

# # Expose the port the app will run on
# EXPOSE 5000

# # Start the Next.js app
# CMD ["npm", "start"]