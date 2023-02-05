# Use an official Node.js runtime as the base image
FROM node:14-alpine

# Set the working directory to /app
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

# Install the required packages specified in package.json
RUN npm install

# Expose port 80 for the app to listen on
EXPOSE 3000

# Run npm start when the container launches
CMD ["npm","start"]
