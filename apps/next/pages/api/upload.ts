// pages/api/upload.ts
import { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import path from "path";
import pdf from "pdf-parse";

import { PrismaClient } from "@prisma/client";

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const form = formidable({ multiples: false, uploadDir: UPLOAD_DIR, keepExtensions: true });

    // Wrap form.parse in a promise to await it properly
    const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    const getFieldString = (field: string | string[] | undefined): string => {
       console.log("getFieldString input:", field);
      if (Array.isArray(field)) return field[0] || "";
      return field || "";
    };

    const formData = {
      name: getFieldString(fields.fullName),
      email: getFieldString(fields.email),
      phone: getFieldString(fields.phone),
      skills: getFieldString(fields.skills),
      experience: getFieldString(fields.experience),
    };

    const file = files.cv;
    let filePath: string | undefined;

    if (file) {
      filePath = Array.isArray(file)
        ? (file[0] as formidable.File)?.filepath
        : (file as formidable.File).filepath;
    }

    if (!filePath) {
      return res.status(400).json({ error: "File path missing" });
    }

    const dataBuffer = fs.readFileSync(filePath);
    const parsed = await pdf(dataBuffer);
    const extractedText = parsed.text || "";

    console.log("Extracted text:", extractedText);

    // Prepare form-data to send to n8n webhook
    const FormData = require("form-data");
    const formPayload = new FormData();

    formPayload.append("formData", JSON.stringify(formData));
    formPayload.append("pdfText", extractedText);

    const payload = {
  formData,      // your form data object
  pdfText: extractedText,  // extracted text string
  // optionally add file info as base64 or skip file upload here
};

    const webhookResponse = await fetch("https://aldoapp.app.n8n.cloud/webhook/compare-form-pdf", {
      method: "POST",
      headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
    });

    const webhookResult = await webhookResponse.json();

    console.log("Webhook response:", webhookResult);
    const content = webhookResult?.message?.content || "";

    if (content.toLowerCase().includes("success: all fields match")) {
      // store record
      const created = await prisma.cVUser.create({
        data: {
          fullName: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          skills: formData.skills || null,
          experience: formData.experience || null,
          pdfPath: filePath,
        },
      });
      console.log("Record created:", created);
    }

    return res.status(webhookResponse.status).json(webhookResult);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error", details: e });
  }
}

