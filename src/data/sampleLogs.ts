export interface IncidentScenario {
  id: string;
  name: string;
  category: string;
  environment: string;
  serviceType: string;
  description: string;
  rawLog: string;
}

export const SAMPLE_INCIDENTS: IncidentScenario[] = [
  {
    id: 'k8s-oomkilled',
    name: 'Kubernetes OOMKilled (Exit Code 137)',
    category: 'Kubernetes & Containers',
    environment: 'Production (EKS)',
    serviceType: 'Java / Spring Boot',
    description: 'Container crashed with exit code 137 due to JVM memory heap allocation exceeding Pod cgroup memory limits.',
    rawLog: `2026-09-26T09:12:04.102Z [main] INFO  c.e.service.OrderProcessor - Initializing batch payment processor...
2026-09-26T09:12:05.811Z [main] INFO  c.e.service.CachePreloader - Loading 850,000 active SKU records into in-memory Guava cache
2026-09-26T09:12:08.432Z [main] WARN  c.e.service.CachePreloader - Heap utilization at 88.4% (462MB of 512MB limit)
2026-09-26T09:12:09.115Z [cluster-monitor] WARNING: Pod order-service-7f9cb8695d-w2px8 in namespace production is exceeding memory threshold
2026-09-26T09:12:09.894Z kernel: [148293.421] Task in /kubepods.slice/kubepods-burstable.slice/pod-order-service killed as a result of limit (cgroup v2)
2026-09-26T09:12:09.895Z kernel: [148293.422] Memory cgroup out of memory: Killed process 38491 (java) total-vm:1894220kB, anon-rss:524288kB, file-rss:1284kB, shmem-rss:0kB
2026-09-26T09:12:10.002Z kubelet: Liveness probe failed: Get "http://10.244.1.84:8080/actuator/health": dial tcp 10.244.1.84:8080: connect: connection refused
2026-09-26T09:12:10.015Z kubelet: Container order-service failed liveness probe, will be restarted
2026-09-26T09:12:10.420Z kubelet: Killing container order-service (id: containerd://98bca487...)
2026-09-26T09:12:10.421Z kubelet: Error: OOMKilled. Container terminated with exit code 137
2026-09-26T09:12:12.190Z kubelet: Back-off restarting failed container order-service in pod order-service-7f9cb8695d-w2px8_production(48a12e5c)
2026-09-26T09:12:14.001Z kube-controller-manager: CrashLoopBackOff: back-off 20s restarting failed container=order-service pod=order-service-7f9cb8695d-w2px8_production`,
  },
  {
    id: 'nginx-502-socket',
    name: 'Nginx 502 Bad Gateway (Socket Permission)',
    category: 'Web Server / Reverse Proxy',
    environment: 'Staging (Ubuntu 24.04)',
    serviceType: 'Nginx + Gunicorn (Python)',
    description: 'Nginx reverse proxy fails with HTTP 502 because the upstream Unix socket has restrictive file permissions.',
    rawLog: `2026-09-26 09:30:11 [info] 18402#18402: *4192 client 198.51.100.44 closed keepalive connection
2026-09-26 09:30:14 [notice] 18402#18402: signal 1 (SIGHUP) received from 18201, reconfiguring filter chains
2026-09-26 09:30:14 [notice] 18402#18402: reconfiguring done
2026-09-26 09:30:15 [crit] 18402#18402: *4201 connect() to unix:/run/gunicorn/app.sock failed (13: Permission denied) while connecting to upstream, client: 203.0.113.19, server: api.internal.corp, request: "POST /v1/auth/login HTTP/1.1", upstream: "http://unix:/run/gunicorn/app.sock:/v1/auth/login", host: "api.internal.corp"
2026-09-26 09:30:15 [crit] 18402#18402: *4202 connect() to unix:/run/gunicorn/app.sock failed (13: Permission denied) while connecting to upstream, client: 203.0.113.88, server: api.internal.corp, request: "GET /v1/health HTTP/1.1", upstream: "http://unix:/run/gunicorn/app.sock:/v1/health", host: "api.internal.corp"
2026-09-26 09:30:16 [error] 18402#18402: *4203 upstream sent no valid HTTP/1.1 response, returning HTTP 502 Bad Gateway to downstream client
2026-09-26 09:30:16 [warn] 18402#18402: *4203 socket file /run/gunicorn/app.sock mode is 0600 owned by root:root, nginx worker process runs as www-data`,
  },
  {
    id: 'postgres-pool-exhausted',
    name: 'PostgreSQL Connection Pool Starvation',
    category: 'Database / Relational',
    environment: 'Production (RDS Aurora)',
    serviceType: 'PostgreSQL & Prisma ORM',
    description: 'Application deployment triggered connection leakage during DB migration, hitting max_connections ceiling.',
    rawLog: `2026-09-26 09:41:02.104 UTC [31024]: [1-1] user=app_user,db=prod_core ERROR:  remaining connection slots are reserved for non-replication superuser connections
2026-09-26 09:41:02.105 UTC [31024]: [2-1] user=app_user,db=prod_core FATAL:  sorry, too many clients already
2026-09-26 09:41:02.106 UTC [31024]: [3-1] user=app_user,db=prod_core DETAIL:  Connection limit is 100, active connections: 100.
2026-09-26 09:41:02.321Z [NestJS] 4210  - 09/26/2026, 9:41:02 AM   ERROR [PrismaClientInitializationError]:
Invalid \`prisma.user.findUnique()\` invocation:
Can't reach database server at \`db.internal:5432\`
Please make sure your database server is running at \`db.internal:5432\`.
Error code: P1001. Raw error: Connection pool timeout: Timed out fetching a new connection from the pool after 10000ms (pool limit: 25 per instance x 6 replicas = 150 requests queued).
2026-09-26 09:41:03.011Z [NestJS] 4210  - 09/26/2026, 9:41:03 AM   FATAL [ApplicationLifecycle] UnhandledPromiseRejection: Database connection failure during deployment health check, exiting process with code 1`,
  },
  {
    id: 'docker-alpine-musl',
    name: 'Docker Alpine Missing Dynamic Linker (musl vs glibc)',
    category: 'CI/CD & Container Build',
    environment: 'CI/CD (GitHub Actions)',
    serviceType: 'Go / Docker Alpine',
    description: 'Binary compiled with CGO dynamically against glibc fails immediately on Alpine Linux base image with "file not found".',
    rawLog: `Step 7/10 : COPY --from=builder /go/bin/api-server /usr/local/bin/api-server
 ---> Using cache
 ---> e7b209d8419a
Step 8/10 : RUN chmod +x /usr/local/bin/api-server
 ---> Running in a47c92b0124f
Removing intermediate container a47c92b0124f
 ---> 88f2bbd92831
Step 9/10 : EXPOSE 8080
 ---> Running in f72b94c2e431
 ---> 184c98e2193b
Step 10/10 : ENTRYPOINT ["/usr/local/bin/api-server"]
Successfully built 184c98e2193b
Successfully tagged registry.internal/api:v2.14.0
+ docker run --rm -d --name test-api -p 8080:8080 registry.internal/api:v2.14.0
e38b417c8d99042b3252a1
+ sleep 3
+ docker logs test-api
standard_init_linux.go:228: exec user process caused: no such file or directory
/usr/local/bin/api-server: line 1: /lib64/ld-linux-x86-64.so.2: not found
Process exited with status 127
ERROR: Smoke test failed: container test-api exited immediately after startup with code 127`,
  },
  {
    id: 'tls-cert-expired',
    name: 'TLS Handshake Certificate Expiration',
    category: 'Security & Networking',
    environment: 'Production (Ingress)',
    serviceType: 'Envoy / mTLS Gateway',
    description: 'Internal microservice mTLS handshake rejected because the intermediate certificate authority cert expired.',
    rawLog: `2026-09-26T09:55:01.019Z [warning][config] [source/common/config/grpc_subscription_impl.cc:119] gRPC config for type.googleapis.com/envoy.config.listener.v3.Listener rejected
2026-09-26T09:55:02.431Z [downstream_peer] [C1492] remote address: 10.0.4.12:48392
2026-09-26T09:55:02.432Z [downstream_peer] [C1492] TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED:ssl/handshake_client.cc:1132:
2026-09-26T09:55:02.433Z [downstream_peer] [C1492] OpenSSL alert code: 45 (certificate_expired)
2026-09-26T09:55:02.433Z http-client: Post "https://billing-internal.mesh.corp/charge": x509: certificate has expired or is not yet valid: current time 2026-09-26T09:55:02Z is after 2026-09-25T23:59:59Z
2026-09-26T09:55:02.434Z http-client: Handshake failed: Subject: CN=billing-internal.mesh.corp, Issuer: CN=Internal Cluster Intermediate CA 2024
2026-09-26T09:55:03.119Z envoy: [C1492] connection termination: SSL handshake failed, downstream reset connection`,
  },
  {
    id: 'port-eaddrinuse',
    name: 'EADDRINUSE Port Collision in Container Host',
    category: 'Runtime / Process Management',
    environment: 'Staging (Docker Compose)',
    serviceType: 'Node.js / Express',
    description: 'Deployment failed because a previous orphaned container process is still holding port 8080 binding.',
    rawLog: `2026-09-26T10:02:18.420Z [info] Starting backend deployment pipeline release-482...
2026-09-26T10:02:19.112Z [info] Migrations verified: 0 pending migrations
2026-09-26T10:02:19.891Z [info] Initializing HTTP listener on 0.0.0.0:8080
node:events:497
      throw er; // Unhandled 'error' event
      ^

Error: listen EADDRINUSE: address already in use 0.0.0.0:8080
    at Server.setupListenHandle [as _listen2] (node:net:1898:16)
    at listenInCluster (node:net:1963:12)
    at doListen (node:net:2135:7)
    at process.processTicksAndRejections (node:internal/process/task_queues:83:21)
Emitted 'error' event on Server instance at:
    at emitErrorNT (node:net:1942:8)
    at process.processTicksAndRejections (node:internal/process/task_queues:82:21) {
  code: 'EADDRINUSE',
  errno: -98,
  syscall: 'listen',
  address: '0.0.0.0',
  port: 8080
}
2026-09-26T10:02:20.104Z [systemd] app.service: Main process exited, code=exited, status=1/FAILURE
2026-09-26T10:02:20.105Z [systemd] app.service: Failed with result 'exit-code'.`,
  },
];
