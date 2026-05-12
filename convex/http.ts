import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";
import { registerRoutes } from "@mzedstudio/uploadthingtrack";
import { components } from "./_generated/api";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);
registerRoutes(http, components.uploadthingFileTracker);

export default http;
