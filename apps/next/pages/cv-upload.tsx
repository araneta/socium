import React, { useState } from "react";
import { useForm } from "react-hook-form";

type FormValues = {
  fullName: string;
  email?: string;
  phone?: string;
  skills?: string;
  experience?: string;
  cv?: FileList;
};

export default function CVUploadPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setResult(null);
    const formData = new FormData();
    formData.append("fullName", data.fullName);
    if (data.email) formData.append("email", data.email);
    if (data.phone) formData.append("phone", data.phone);
    if (data.skills) formData.append("skills", data.skills);
    if (data.experience) formData.append("experience", data.experience);
    if (data.cv && data.cv.length > 0) {
      formData.append("cv", data.cv[0]);
    }

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      setResult({ status: res.status, body: json });
    } catch (e) {
      setResult({ error: e });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "2rem auto" }}>
      <h1>Upload your CV</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>Full name</label>
          <input {...register("fullName", { required: true })} />
          {errors.fullName && <span>Full name is required</span>}
        </div>

        <div>
          <label>Email</label>
          <input {...register("email")} type="email" />
        </div>

        <div>
          <label>Phone</label>
          <input {...register("phone")} />
        </div>

        <div>
          <label>Skills (comma separated)</label>
          <input {...register("skills")} />
        </div>

        <div>
          <label>Experience (short text)</label>
          <textarea {...register("experience")} />
        </div>

        <div>
          <label>Upload PDF CV</label>
          <input {...register("cv", { required: true })} type="file" accept="application/pdf" />
        </div>

        <button type="submit" disabled={loading}>Submit</button>
      </form>

      {loading && <p>Validating...</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>Result</h2>
          <p>Status: {result.body.message.content}</p>
          
          <p>Log:</p>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
