import { app } from "./app";
import { env } from "./config/env";

const server = app.listen(env.port, () => console.log(`RawHabit server listening on http://localhost:${env.port}`));
server.ref();
