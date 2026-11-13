import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import multer from "multer";
import sharp from "sharp";
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";
import nodemailer from "nodemailer";
import { randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { z } from "zod";
import { openDb, readDoc, merge, SqliteStore } from "./db.js";
import { seed, defaults } from "./seed.js";
import { hashPassword, verifyPassword, csrfToken } from "./security.js";
import {
  articleSchema,
  contactSchema,
  styleSchema,
  validateTree,
  validateShape,
} from "./schema.js";
import { version } from "./version.js";
const purify = createDOMPurify(new JSDOM("").window);
const fail = (status, code) => Object.assign(new Error(code), { status, code });
export function createApp({
  directory = path.resolve(process.env.DATA_DIR || ".data"),
  origin = process.env.APP_ORIGIN || "http://localhost:3000",
  secure = process.env.COOKIE_SECURE === "true",
  limits = true,
  development = false,
  localPreview = false,
  initialSetupToken,
} = {}) {
  if (
    !localPreview &&
    process.env.NODE_ENV === "production" &&
    (!secure || !origin.startsWith("https://"))
  )
    throw Error("Production requires HTTPS APP_ORIGIN and COOKIE_SECURE=true");
  if (localPreview && !/^http:\/\/127\.0\.0\.1:\d+$/.test(origin))
    throw Error("Preview must use a loopback origin");
  if (initialSetupToken && (!localPreview || initialSetupToken.length < 48))
    throw Error("Initial setup requires a local preview capability");
  const db = openDb(directory);
  seed(db);
  const secretFile = path.join(directory, "session.key");
  if (!existsSync(secretFile))
    writeFileSync(secretFile, randomBytes(48).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  const app = express();
  const cookieName = localPreview
    ? `bsign.preview.${new URL(origin).port}`
    : "bsign.sid";
  app.disable("x-powered-by");
  app.set(
    "trust proxy",
    localPreview ? false : Number(process.env.TRUST_PROXY || 0),
  );
  if (localPreview)
    app.use((q, r, next) => {
      if (q.headers.host !== new URL(origin).host)
        return r.status(403).json({ error: "HOST" });
      next();
    });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "img-src": ["'self'", "data:", "https:"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "script-src": development
            ? ["'self'", "'unsafe-inline'"]
            : ["'self'"],
          "connect-src": development ? ["'self'", "ws:"] : ["'self'"],
          "frame-src": ["https://www.google.com"],
          "upgrade-insecure-requests": secure ? [] : null,
        },
      },
    }),
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(
    session({
      name: cookieName,
      secret: readFileSync(secretFile, "utf8"),
      resave: false,
      saveUninitialized: false,
      store: new SqliteStore(db),
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        secure,
        maxAge: 8 * 3600000,
      },
    }),
  );
  app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
      if (req.headers.origin !== origin)
        return res.status(403).json({ error: "ORIGIN" });
      if (!req.session.csrf || req.get("x-csrf-token") !== req.session.csrf)
        return res.status(403).json({ error: "CSRF" });
    }
    next();
  });
  app.get("/api/health", (_q, r) =>
    r.json({
      ok: db.prepare("SELECT 1 AS ok").get().ok === 1,
      version,
    }),
  );
  app.get("/api/session", (q, r) =>
    r.json({ csrf: csrfToken(q), authenticated: Boolean(q.session.user) }),
  );
  const limiter = (max) =>
    rateLimit({
      windowMs: 15 * 60000,
      limit: max,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "RATE_LIMIT" },
    });
  const auth = (q, r, n) =>
    q.session.user ? n() : r.status(401).json({ error: "UNAUTHORIZED" });
  const audit = (q, action) =>
    db
      .prepare("INSERT INTO audit(actor,action,created_at) VALUES(?,?,?)")
      .run(q.session.user, action, new Date().toISOString());
  const loginLimit = limits ? limiter(10) : (_q, _r, n) => n();
  if (initialSetupToken) {
    const capability = (q, r, next) => {
      const remote = q.socket.remoteAddress;
      const supplied = q.get("X-BSIGN-Setup") || "";
      if (
        !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) ||
        Buffer.byteLength(supplied) !== Buffer.byteLength(initialSetupToken) ||
        !timingSafeEqual(Buffer.from(supplied), Buffer.from(initialSetupToken))
      )
        return r.status(403).json({ error: "SETUP_LINK_REQUIRED" });
      next();
    };
    app.get("/api/setup", capability, (_q, r) =>
      r.json({ needsSetup: !db.prepare("SELECT 1 FROM users LIMIT 1").get() }),
    );
    // Local file ownership grants this launcher capability; it is never
    // available through the public app, ordinary login, or normal startup.
    app.get("/api/local-account", capability, (_q, r) =>
      r.json({
        accounts: db.prepare("SELECT email FROM users ORDER BY id").all(),
      }),
    );
    app.post("/api/local-account", loginLimit, capability, async (q, r) => {
      const b = z
        .object({
          email: z.email().max(254),
          password: z.string().min(12).max(200),
        })
        .parse(q.body);
      const user = db
        .prepare("SELECT id FROM users WHERE email=?")
        .get(b.email.toLowerCase());
      if (!user) throw fail(404, "ACCOUNT_NOT_FOUND");
      const hash = await hashPassword(b.password);
      db.exec("BEGIN IMMEDIATE");
      try {
        db.prepare("UPDATE users SET password=? WHERE id=?").run(hash, user.id);
        db.prepare("DELETE FROM sessions").run();
        db.prepare(
          "INSERT INTO audit(actor,action,created_at) VALUES(?,?,?)",
        ).run(
          user.id,
          "local-account:password-reset",
          new Date().toISOString(),
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      q.session.destroy(() => {
        r.clearCookie(cookieName);
        r.json({ ok: true });
      });
    });
    app.post("/api/setup", loginLimit, capability, async (q, r) => {
      const b = z
        .object({
          email: z.email().max(254),
          password: z.string().min(12).max(200),
        })
        .parse(q.body);
      if (db.prepare("SELECT 1 FROM users LIMIT 1").get())
        throw fail(409, "SETUP_COMPLETE");
      const hash = await hashPassword(b.password);
      let id;
      db.exec("BEGIN IMMEDIATE");
      try {
        if (db.prepare("SELECT 1 FROM users LIMIT 1").get())
          throw fail(409, "SETUP_COMPLETE");
        id = Number(
          db
            .prepare("INSERT INTO users(email,password) VALUES(?,?)")
            .run(b.email.toLowerCase(), hash).lastInsertRowid,
        );
        db.exec("COMMIT");
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
      await new Promise((resolve, reject) =>
        q.session.regenerate((e) => (e ? reject(e) : resolve())),
      );
      q.session.user = id;
      r.status(201).json({ authenticated: true, csrf: csrfToken(q) });
    });
  }
  app.post("/api/login", loginLimit, async (q, r) => {
    const { email, password } = z
      .object({ email: z.email(), password: z.string().min(1).max(200) })
      .parse(q.body);
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(email.toLowerCase());
    // Use an equal-cost derivation when no account exists.
    const ok = user
      ? await verifyPassword(password, user.password)
      : (await hashPassword(password), false);
    if (!ok) throw fail(401, "INVALID_CREDENTIALS");
    await new Promise((resolve, reject) =>
      q.session.regenerate((e) => (e ? reject(e) : resolve())),
    );
    q.session.user = user.id;
    r.json({ csrf: csrfToken(q), authenticated: true });
  });
  app.post("/api/logout", auth, (q, r) =>
    q.session.destroy(() => {
      r.clearCookie(cookieName);
      r.json({ ok: true });
    }),
  );
  app.post("/api/password", auth, loginLimit, async (q, r) => {
    const b = z
      .object({
        current: z.string().max(200),
        password: z.string().min(12).max(200),
      })
      .parse(q.body);
    const u = db.prepare("SELECT * FROM users WHERE id=?").get(q.session.user);
    if (!(await verifyPassword(b.current, u.password)))
      throw fail(400, "INVALID_PASSWORD");
    db.prepare("UPDATE users SET password=? WHERE id=?").run(
      await hashPassword(b.password),
      u.id,
    );
    db.prepare("DELETE FROM sessions").run();
    q.session.destroy(() => r.json({ ok: true }));
  });
  app.get("/api/content", (_q, r) =>
    r.json(
      Object.fromEntries(
        db
          .prepare("SELECT key,value FROM documents")
          .all()
          .filter((x) => !x.key.startsWith("_"))
          .map((x) => [x.key, JSON.parse(x.value)]),
      ),
    ),
  );
  app.get("/api/admin/documents", auth, (_q, r) =>
    r.json(
      Object.fromEntries(Object.keys(defaults).map((k) => [k, readDoc(db, k)])),
    ),
  );
  app.get("/api/admin/defaults", auth, (_q, r) => r.json(defaults));
  app.patch("/api/admin/documents/:key", auth, (q, r) => {
    if (!Object.hasOwn(defaults, q.params.key)) throw fail(404, "NOT_FOUND");
    const old = readDoc(db, q.params.key);
    if (q.body.revision !== old.revision) throw fail(409, "REVISION_CONFLICT");
    if (
      !q.body.patch ||
      typeof q.body.patch !== "object" ||
      Array.isArray(q.body.patch)
    )
      throw fail(400, "INVALID_PATCH");
    const value = merge(old.value, q.body.patch);
    try {
      validateTree(value);
      validateShape(defaults[q.params.key], value);
    } catch {
      throw fail(400, "VALIDATION");
    }
    if (q.params.key === "styles")
      Object.values(value).forEach((s) => styleSchema.parse(s));
    if (q.params.key === "contact")
      z.object({
        confirmed: z.boolean(),
        latitude: z.number().min(-90).max(90),
        longitude: z.number().min(-180).max(180),
      }).parse(value.map);
    if (q.params.key === "news") {
      z.number().int().min(1).max(30).parse(value.pageSize);
      z.array(
        z.object({
          id: z.string().regex(/^[a-z0-9-]+$/),
          label: z.object({ th: z.string(), en: z.string() }),
        }),
      )
        .min(1)
        .parse(value.categories);
      if (
        new Set(value.categories.map((c) => c.id)).size !==
        value.categories.length
      )
        throw fail(400, "DUPLICATE_CATEGORY");
      const ids = value.categories.map((c) => c.id);
      if (
        db
          .prepare("SELECT value FROM articles")
          .all()
          .some((a) => !ids.includes(JSON.parse(a.value).category))
      )
        throw fail(400, "CATEGORY_IN_USE");
    }
    if (q.params.key === "icons")
      for (const s of [
        ...Object.values(value.shared),
        ...Object.values(value.overrides),
      ].filter(Boolean)) {
        z.object({
          name: z.string().max(50),
          color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
          background: z.string().regex(/^#[a-fA-F0-9]{6}$/),
          asset: z.string().regex(/^$|^\/uploads\/[a-f0-9-]+\.(svg|png|webp)$/),
          mode: z.enum(["mask", "image"]),
        }).parse(s);
        if (s.mode === "mask" && s.asset && !s.asset.endsWith(".svg"))
          throw fail(400, "RASTER_COLOR_UNSUPPORTED");
      }
    const result = db
      .prepare(
        "UPDATE documents SET value=?, revision=revision+1 WHERE key=? AND revision=?",
      )
      .run(JSON.stringify(value), q.params.key, old.revision);
    if (!result.changes) throw fail(409, "REVISION_CONFLICT");
    audit(q, "document:" + q.params.key);
    r.json(readDoc(db, q.params.key));
  });
  const rows = () =>
    db
      .prepare("SELECT * FROM articles")
      .all()
      .map((a) => ({ id: a.id, revision: a.revision, ...JSON.parse(a.value) }));
  const published = () =>
    rows()
      .filter(
        (a) =>
          a.status === "published" && Date.parse(a.publishedAt) <= Date.now(),
      )
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  app.get("/api/articles", (q, r) => {
    const lang = q.query.lang === "en" ? "en" : "th";
    const search = String(q.query.q || "")
      .slice(0, 200)
      .toLowerCase();
    const category = String(q.query.category || "");
    const all = published().filter(
      (a) =>
        (!category || a.category === category) &&
        [a.title[lang], a.excerpt[lang], a.body[lang]].some((t) =>
          t.toLowerCase().includes(search),
        ),
    );
    const size = readDoc(db, "news").value.pageSize;
    const page = Math.max(1, Math.min(100000, parseInt(q.query.page) || 1));
    r.json({
      items: all.slice((page - 1) * size, page * size),
      total: all.length,
      pages: Math.ceil(all.length / size),
      page,
    });
  });
  app.get("/api/articles/:slug", (q, r) => {
    const a = published().find((a) => a.slug === q.params.slug);
    if (!a) throw fail(404, "NOT_FOUND");
    r.json(a);
  });
  app.get("/api/admin/articles", auth, (_q, r) => r.json(rows()));
  app.get("/api/admin/overview", auth, (_q, r) => {
    const articles = rows();
    const now = Date.now();
    const count = (table, where = "") =>
      db.prepare(`SELECT count(*) AS total FROM ${table}${where}`).get().total;
    const uploads = path.join(directory, "uploads");
    let uploadsBytes = 0;
    for (const entry of readdirSync(uploads, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      try {
        const file = statSync(path.join(uploads, entry.name));
        if (file.isFile()) uploadsBytes += file.size;
      } catch (error) {
        // A file removed between directory listing and stat is already gone.
        if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      }
    }
    r.json({
      counts: {
        articles: articles.length,
        published: articles.filter(
          (a) => a.status === "published" && Date.parse(a.publishedAt) <= now,
        ).length,
        draft: articles.filter((a) => a.status === "draft").length,
        scheduled: articles.filter(
          (a) => a.status === "published" && Date.parse(a.publishedAt) > now,
        ).length,
        contacts: count("contacts"),
        unread: count("contacts", " WHERE status='new'"),
        subscribers: count("subscribers"),
        media: count("media"),
        admins: count("users"),
      },
      recentArticles: [...articles]
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 5)
        .map((a) => ({
          id: a.id,
          title: { th: a.title.th, en: a.title.en },
          status: a.status,
          publishedAt: a.publishedAt,
        })),
      recentContacts: db
        .prepare(
          "SELECT id,value,status,created_at FROM contacts ORDER BY created_at DESC LIMIT 3",
        )
        .all()
        .map((c) => {
          const value = JSON.parse(c.value);
          return {
            id: c.id,
            name: value.name,
            email: value.email,
            status: c.status,
            createdAt: c.created_at,
          };
        }),
      system: {
        version,
        database: "SQLite",
        healthy: db.prepare("SELECT 1 AS ok").get().ok === 1,
        uploadsBytes,
        smtpConfigured: Boolean(
          process.env.SMTP_HOST && process.env.MAIL_FROM && process.env.MAIL_TO,
        ),
        schemaVersion: db.prepare("SELECT max(version) AS version FROM migrations")
          .get().version,
      },
    });
  });
  const validArticle = (value, id) => {
    const a = articleSchema.parse(value);
    if (!readDoc(db, "news").value.categories.some((c) => c.id === a.category))
      throw fail(400, "INVALID_CATEGORY");
    if (rows().some((r) => r.id !== id && r.slug === a.slug))
      throw fail(409, "DUPLICATE_SLUG");
    return a;
  };
  app.post("/api/admin/articles", auth, (q, r) => {
    const value = validArticle(q.body);
    const id = randomUUID();
    db.prepare("INSERT INTO articles(id,value) VALUES(?,?)").run(
      id,
      JSON.stringify(value),
    );
    audit(q, "article:create");
    r.status(201).json({ id, ...value, revision: 1 });
  });
  app.patch("/api/admin/articles/:id", auth, (q, r) => {
    const old = rows().find((a) => a.id === q.params.id);
    if (!old) throw fail(404, "NOT_FOUND");
    if (q.body.revision !== old.revision) throw fail(409, "REVISION_CONFLICT");
    const combined = merge(old, q.body.patch);
    validArticle(combined, old.id);
    delete combined.id;
    delete combined.revision;
    db.prepare(
      "UPDATE articles SET value=?,revision=revision+1 WHERE id=? AND revision=?",
    ).run(JSON.stringify(combined), old.id, old.revision);
    audit(q, "article:update");
    r.json({ id: old.id, ...combined, revision: old.revision + 1 });
  });
  app.delete("/api/admin/articles/:id", auth, (q, r) => {
    const result = db
      .prepare("DELETE FROM articles WHERE id=? AND revision=?")
      .run(q.params.id, Number(q.body.revision));
    if (!result.changes) throw fail(409, "REVISION_CONFLICT");
    audit(q, "article:delete");
    r.json({ ok: true });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });
  app.get("/api/admin/media", auth, (_q, r) =>
    r.json(
      db
        .prepare("SELECT * FROM media ORDER BY created_at DESC")
        .all()
        .map((m) => ({ ...m, url: "/uploads/" + m.id })),
    ),
  );
  app.post("/api/admin/media", auth, upload.single("file"), async (q, r) => {
    if (!q.file) throw fail(400, "FILE_REQUIRED");
    const source = z
      .string()
      .max(2000)
      .parse(q.body.source || "");
    const license = z
      .string()
      .max(500)
      .parse(q.body.license || "");
    let buffer, mime, ext;
    if (q.file.mimetype === "image/svg+xml") {
      const raw = q.file.buffer.toString("utf8");
      if (/<!DOCTYPE|<!ENTITY/i.test(raw)) throw fail(400, "UNSAFE_SVG");
      const clean = purify.sanitize(raw, {
        USE_PROFILES: { svg: true, svgFilters: false },
        FORBID_TAGS: [
          "style",
          "foreignObject",
          "image",
          "use",
          "a",
          "animate",
          "animateMotion",
          "animateTransform",
          "set",
          "script",
        ],
        FORBID_ATTR: ["style", "href", "xlink:href"],
      });
      const doc = new JSDOM(clean, { contentType: "image/svg+xml" });
      if (doc.window.document.documentElement.localName !== "svg")
        throw fail(400, "INVALID_SVG");
      for (const el of doc.window.document.querySelectorAll("*"))
        for (const a of [...el.attributes])
          if (/url\s*\(/i.test(a.value) || /^on/i.test(a.name))
            el.removeAttribute(a.name);
      buffer = Buffer.from(doc.serialize());
      mime = "image/svg+xml";
      ext = "svg";
      doc.window.close();
    } else {
      const metadata = await sharp(q.file.buffer, {
        limitInputPixels: 20000000,
      }).metadata();
      if (!["png", "jpeg", "webp"].includes(metadata.format))
        throw fail(400, "INVALID_IMAGE");
      buffer = await sharp(q.file.buffer, { limitInputPixels: 20000000 })
        .rotate()
        .webp({ quality: 90 })
        .toBuffer();
      mime = "image/webp";
      ext = "webp";
    }
    const id = randomUUID() + "." + ext;
    writeFileSync(path.join(directory, "uploads", id), buffer, {
      flag: "wx",
      mode: 0o600,
    });
    db.prepare("INSERT INTO media VALUES(?,?,?,?,?,?)").run(
      id,
      q.file.originalname.slice(0, 200),
      mime,
      source,
      license,
      new Date().toISOString(),
    );
    audit(q, "media:create");
    r.status(201).json({ id, url: "/uploads/" + id, mime });
  });
  app.use(
    "/uploads",
    express.static(path.join(directory, "uploads"), {
      dotfiles: "deny",
      setHeaders(res) {
        res.set(
          "Content-Security-Policy",
          "default-src 'none'; style-src 'none'; sandbox",
        );
        res.set("X-Content-Type-Options", "nosniff");
      },
    }),
  );
  app.post(
    "/api/contact",
    limits ? limiter(5) : (_q, _r, n) => n(),
    async (q, r) => {
      const value = contactSchema.parse(q.body);
      delete value.website;
      const id = randomUUID();
      db.prepare("INSERT INTO contacts(id,value,created_at) VALUES(?,?,?)").run(
        id,
        JSON.stringify(value),
        new Date().toISOString(),
      );
      let mailStatus = "not_configured";
      if (
        process.env.SMTP_HOST &&
        process.env.MAIL_FROM &&
        process.env.MAIL_TO
      ) {
        try {
          const transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure: process.env.SMTP_SECURE === "true",
            requireTLS: process.env.SMTP_SECURE !== "true",
            auth: process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
              : undefined,
            connectionTimeout: 10000,
            socketTimeout: 15000,
          });
          await transport.sendMail({
            from: process.env.MAIL_FROM,
            to: process.env.MAIL_TO,
            replyTo: value.email,
            subject: "BSIGN TECH contact enquiry",
            text: JSON.stringify(value, null, 2),
          });
          mailStatus = "sent";
        } catch {
          mailStatus = "failed";
        }
      }
      db.prepare("UPDATE contacts SET mail_status=? WHERE id=?").run(
        mailStatus,
        id,
      );
      r.status(201).json({ saved: true, mailStatus });
    },
  );
  app.get("/api/admin/contacts", auth, (_q, r) =>
    r.json(
      db
        .prepare("SELECT * FROM contacts ORDER BY created_at DESC")
        .all()
        .map((x) => ({ ...x, value: JSON.parse(x.value) })),
    ),
  );
  app.patch("/api/admin/contacts/:id", auth, (q, r) => {
    const status = z.enum(["new", "read", "resolved"]).parse(q.body.status);
    db.prepare("UPDATE contacts SET status=? WHERE id=?").run(
      status,
      q.params.id,
    );
    r.json({ ok: true });
  });
  app.delete("/api/admin/contacts/:id", auth, (q, r) => {
    db.prepare("DELETE FROM contacts WHERE id=?").run(q.params.id);
    audit(q, "contact:delete");
    r.json({ ok: true });
  });
  app.post(
    "/api/subscribe",
    limits ? limiter(5) : (_q, _r, n) => n(),
    (q, r) => {
      const b = z
        .object({ email: z.email().max(254), consent: z.literal(true) })
        .parse(q.body);
      db.prepare("INSERT OR IGNORE INTO subscribers VALUES(?,?,?)").run(
        randomUUID(),
        b.email.toLowerCase(),
        new Date().toISOString(),
      );
      r.status(201).json({ saved: true, mailStatus: "not_configured" });
    },
  );
  app.get("/api/admin/subscribers", auth, (_q, r) =>
    r.json(db.prepare("SELECT * FROM subscribers").all()),
  );
  app.delete("/api/admin/subscribers/:id", auth, (q, r) => {
    db.prepare("DELETE FROM subscribers WHERE id=?").run(q.params.id);
    r.json({ ok: true });
  });
  app.use("/api", (_q, r) => r.status(404).json({ error: "NOT_FOUND" }));
  app.use((e, _q, r, _n) =>
    r
      .status(
        e.status ||
          (e instanceof z.ZodError || e instanceof multer.MulterError
            ? 400
            : 500),
      )
      .json({
        error:
          e.code || (e instanceof z.ZodError ? "VALIDATION" : "REQUEST_FAILED"),
      }),
  );
  return { app, db, directory };
}
