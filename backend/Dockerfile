FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy Maven files separately for layer caching
COPY pom.xml .
COPY src src

# Build the application
RUN mvn clean package -DskipTests

# Create the runtime image
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

# Expose the application port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
