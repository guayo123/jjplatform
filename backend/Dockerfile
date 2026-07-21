# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-17-alpine AS build
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

# ---- Runtime stage ----
# Non-Alpine (glibc) base: Railway injects a glibc-linked `catatonit` init
# process when a volume is mounted, which fails to exec on musl/Alpine.
FROM eclipse-temurin:17-jre
WORKDIR /app

RUN mkdir -p /uploads

COPY --from=build /app/target/jjplatform-api-*.jar app.jar

EXPOSE 8080

# Cap glibc malloc arenas. The default (8 x CPU cores) lets each of the JVM's
# many threads retain its own memory pool, inflating RSS well past the heap and
# releasing it only slowly — the cause of the multi-GB native memory spikes seen
# on Railway. 2 arenas keeps native RSS flat with negligible contention.
ENV MALLOC_ARENA_MAX=2

# Cap the JVM heap: without -Xmx the container-aware JVM can size MaxHeap off the host's
# total RAM (Railway), ballooning memory to several GB. 512m max keeps the footprint small.
ENTRYPOINT ["java", "-Xmx512m", "-Xms256m", "-XX:+ExitOnOutOfMemoryError", "-jar", "app.jar"]
