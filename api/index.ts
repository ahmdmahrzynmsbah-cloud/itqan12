export default async function handler(req: any, res: any) {
  try {
    let app: any;
    try {
      const module = await import("../server.js");
      app = module.default;
    } catch {
      const module = await import("../server.ts");
      app = module.default;
    }
    
    if (!app) {
      throw new Error("Server application was not loaded or exported correctly from server.ts");
    }
    
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel Serverless Function Crash:", error);
    res.status(500).json({
      success: false,
      error: "Vercel API Handler Crash",
      message: error.message || String(error),
      stack: error.stack,
      hint: "Check server.ts imports or firestore initialization configuration"
    });
  }
}

