FROM alpine:3.22 AS extract
COPY pocketbase.zip /tmp/pocketbase.zip
RUN unzip /tmp/pocketbase.zip pocketbase -d /pb

FROM alpine:3.22
COPY --from=extract /pb/pocketbase /pb/pocketbase
COPY pb_migrations /pb/pb_migrations
COPY pb_hooks /pb/pb_hooks
WORKDIR /pb
EXPOSE 8090
CMD ["./pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data"]
