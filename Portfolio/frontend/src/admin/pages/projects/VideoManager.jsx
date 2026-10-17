import { useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Captions, CheckCircle2, Eye, EyeOff, Film, Link2, RefreshCw, Star, Trash2, Upload } from 'lucide-react';
import { api, uploadWithProgress } from '../../../lib/api';
import { formatDuration } from '../../../lib/caseStudy';
import { Spinner } from '../../components/Feedback';
import { Field } from '../../components/Fields';
import { useToast } from '../../toastContext';
import { childUrl, moveIds, useChildList } from './childList';

const mb = (bytes) => (bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '');

/**
 * 1. ask the server how to upload (/upload/): straight to object storage with a short-lived signed
 *    PUT URL, or to Django when media is stored locally; 2. send the file with progress; 3. for direct
 *    uploads, ask the server to verify the stored object (/complete/). Only then is the video "ready".
 */
async function sendVideoFile(projectId, videoId, file, onProgress) {
  const plan = await api(childUrl(projectId, 'videos', videoId, 'upload'), { method: 'POST', body: { size: file.size } });
  if (file.size > plan.max_bytes) throw new Error(`Videos must be ${Math.round(plan.max_bytes / 1024 / 1024)} MB or smaller.`);
  if (plan.mode === 'direct') {
    await uploadWithProgress(plan.url, file, { direct: true, method: plan.method, headers: plan.headers, onProgress });
    return api(childUrl(projectId, 'videos', videoId, 'complete'), { method: 'POST' });
  }
  return uploadWithProgress(plan.url, file, { onProgress });
}

const StatusLine = ({ video }) => {
  if (video.processing_status === 'ready') {
    const facts = [video.video_codec && `${video.video_codec}${video.audio_codec ? ` / ${video.audio_codec}` : ''}`,
      video.width && `${video.width}×${video.height}`, formatDuration(video.duration_seconds), mb(video.file_size_bytes)].filter(Boolean);
    return <p className="flex items-center gap-1.5 text-xs text-emerald-200"><CheckCircle2 size={13} aria-hidden="true" />Ready{facts.length ? ` · ${facts.join(' · ')}` : ''}</p>;
  }
  if (video.processing_status === 'failed') {
    return <p className="flex items-center gap-1.5 text-xs text-red-200"><AlertTriangle size={13} aria-hidden="true" />Rejected: {video.failure_reason}</p>;
  }
  return <p className="text-xs text-amber-200/80">Waiting for the video file.</p>;
};

const Preview = ({ video }) => {
  if (video.processing_status !== 'ready') return null;
  if (video.embed_url) {
    return <iframe src={video.embed_url} title={`Preview: ${video.title}`} className="aspect-video w-full rounded-lg border border-white/10"
                   allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy" />;
  }
  return (
    <video controls preload="metadata" poster={video.poster_media?.url} className="aspect-video w-full rounded-lg border border-white/10 bg-black">
      <source src={video.video_url} type="video/mp4" />
      {video.captions_url && <track kind="captions" src={video.captions_url} srcLang={video.captions_language} label={video.captions_label} default />}
    </video>
  );
};

const VideoCard = ({ video, index, count, projectId, run, reorderBy }) => {
  const { notify, confirm } = useToast();
  const [values, setValues] = useState(video);
  const [progress, setProgress] = useState(null);
  const fileInput = useRef(null);
  const captionsInput = useRef(null);
  const url = (...rest) => childUrl(projectId, 'videos', video.id, ...rest);
  const dirty = ['title', 'description', 'captions_language', 'captions_label'].some((k) => values[k] !== video[k])
    || (values.poster_media?.id ?? null) !== (video.poster_media?.id ?? null);

  const save = () => run(() => api(url(), { method: 'PATCH', body: {
    title: values.title, description: values.description, captions_language: values.captions_language,
    captions_label: values.captions_label, poster_media: values.poster_media?.id ?? null,
  } }), 'Video details saved.').catch(() => {});
  const uploadFile = async (file) => {
    if (!file) return;
    setProgress(0);
    try {
      await run(() => sendVideoFile(projectId, video.id, file, setProgress), video.video_url ? 'Video replaced.' : 'Video uploaded and checked.');
    } catch (e) {
      notify(e.fieldErrors?.file || e.message, 'error');
    } finally {
      setProgress(null);
    }
  };
  const uploadCaptions = async (file) => {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    await run(() => api(url('captions'), { method: 'POST', body }), 'Captions added.').catch(() => {});
  };
  const remove = async () => {
    if (await confirm({ title: 'Delete this video?', message: `“${video.title}” and its uploaded files will be deleted.`, confirmLabel: 'Delete', danger: true })) {
      run(() => api(url(), { method: 'DELETE' }), 'Video deleted.').catch(() => {});
    }
  };
  const isUpload = video.source_type === 'upload';

  return (
    <li className="grid gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="grid content-start gap-3">
        <Preview video={video} />
        {video.processing_status !== 'ready' && (
          <div className="grid aspect-video place-items-center rounded-lg border border-dashed border-white/15 text-sm text-slate-400">
            <span className="flex items-center gap-2"><Film size={16} aria-hidden="true" />No playable file yet</span>
          </div>
        )}
        <StatusLine video={video} />
        {progress !== null && (
          <div role="status">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-sky-300 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
            <p className="mt-1 text-xs text-slate-400">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : 'Checking the file…'}</p>
          </div>
        )}
      </div>
      <div className="grid content-start gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {video.is_primary && <span className="admin-badge admin-badge-new"><Star size={11} aria-hidden="true" />Primary</span>}
          <span className={`admin-badge ${video.is_published ? 'admin-badge-published' : 'admin-badge-draft'}`}>{video.is_published ? 'Published' : 'Not published'}</span>
          <span className="admin-badge admin-badge-muted">{isUpload ? 'Uploaded file' : video.source_type === 'youtube' ? 'YouTube' : 'Vimeo'}</span>
        </div>
        <Field field={{ name: 'title', label: 'Title', required: true }} value={values.title} onChange={(_, v) => setValues((s) => ({ ...s, title: v }))} />
        <Field field={{ name: 'description', label: 'Short description', type: 'textarea', rows: 2, maxLength: 1000 }} value={values.description}
               onChange={(_, v) => setValues((s) => ({ ...s, description: v }))} />
        <Field field={{ name: 'poster_media', label: 'Poster image', type: 'media', hint: 'Shown before the video plays.' }} value={values.poster_media}
               onChange={(_, v) => setValues((s) => ({ ...s, poster_media: v }))} />
        {isUpload && (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field field={{ name: 'captions_language', label: 'Caption language', placeholder: 'en', full: false }} value={values.captions_language}
                   onChange={(_, v) => setValues((s) => ({ ...s, captions_language: v }))} />
            <Field field={{ name: 'captions_label', label: 'Caption label', placeholder: 'English', full: false }} value={values.captions_label}
                   onChange={(_, v) => setValues((s) => ({ ...s, captions_label: v }))} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={!dirty} onClick={save}>Save details</button>
          {isUpload && (
            <button type="button" className="admin-btn admin-btn-sm" disabled={progress !== null} onClick={() => fileInput.current.click()}>
              {video.video_url ? <><RefreshCw size={13} />Replace file</> : <><Upload size={13} />Upload MP4</>}
            </button>
          )}
          {isUpload && (
            <button type="button" className="admin-btn admin-btn-sm" onClick={() => captionsInput.current.click()}><Captions size={13} />{video.captions_url ? 'Replace captions' : 'Add captions (.vtt)'}</button>
          )}
          {video.captions_url && <button type="button" className="admin-btn admin-btn-sm" onClick={() => run(() => api(url('captions'), { method: 'DELETE' }), 'Captions removed.').catch(() => {})}>Remove captions</button>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
          <button type="button" className="admin-btn admin-btn-sm" disabled={video.processing_status !== 'ready'}
                  onClick={() => run(() => api(url(video.is_published ? 'unpublish' : 'publish'), { method: 'POST' }), video.is_published ? 'Video hidden from the public page.' : 'Video published.').catch(() => {})}>
            {video.is_published ? <><EyeOff size={13} />Unpublish</> : <><Eye size={13} />Publish</>}
          </button>
          {!video.is_primary && <button type="button" className="admin-btn admin-btn-sm" onClick={() => run(() => api(url(), { method: 'PATCH', body: { is_primary: true } }), 'Set as the primary video.').catch(() => {})}><Star size={13} />Make primary</button>}
          <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${video.title} up`} disabled={index === 0} onClick={() => reorderBy(index, -1)}><ArrowUp size={13} /></button>
          <button type="button" className="admin-btn admin-btn-sm" aria-label={`Move ${video.title} down`} disabled={index === count - 1} onClick={() => reorderBy(index, 1)}><ArrowDown size={13} /></button>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={remove}><Trash2 size={13} />Delete</button>
        </div>
      </div>
      <input ref={fileInput} type="file" accept="video/mp4" hidden onChange={(e) => { uploadFile(e.target.files[0]); e.target.value = ''; }} />
      <input ref={captionsInput} type="file" accept=".vtt,text/vtt" hidden onChange={(e) => { uploadCaptions(e.target.files[0]); e.target.value = ''; }} />
    </li>
  );
};

const AddVideo = ({ projectId, run, onDone }) => {
  const { notify } = useToast();
  const [source, setSource] = useState('upload');
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [errors, setErrors] = useState({});

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});
    const isLink = source !== 'upload';
    if (!title.trim()) return setErrors({ title: 'Give the video a title.' });
    if (!isLink && !file) return setErrors({ file: 'Choose an MP4 file.' });
    let created;
    try {
      created = await api(childUrl(projectId, 'videos'), { method: 'POST', body: { title, source_type: source, ...(isLink ? { external_url: link } : {}) } });
    } catch (err) {
      return setErrors(err.fieldErrors || { title: err.message });
    }
    if (!isLink) {
      setProgress(0);
      try {
        await sendVideoFile(projectId, created.id, file, setProgress);
      } catch (err) {
        notify(`The video was added but the file was rejected: ${err.fieldErrors?.file || err.message}`, 'error');
      } finally {
        setProgress(null);
      }
    }
    await run(async () => {}, isLink ? 'Video link added. Publish it when you are ready.' : null).catch(() => {});
    onDone();
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 rounded-xl border border-sky-300/20 bg-sky-300/[0.03] p-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="admin-label">Source</legend>
        {[['upload', 'Upload an MP4', Upload], ['youtube', 'YouTube link', Link2], ['vimeo', 'Vimeo link', Link2]].map(([value, label, Icon]) => (
          <label key={value} className={`admin-btn admin-btn-sm cursor-pointer ${source === value ? 'border-sky-300/60 bg-sky-300/10' : ''}`}>
            <input type="radio" name="video-source" value={value} checked={source === value} onChange={() => setSource(value)} className="sr-only" />
            <Icon size={13} aria-hidden="true" />{label}
          </label>
        ))}
      </fieldset>
      <Field field={{ name: 'title', label: 'Title', required: true, placeholder: 'e.g. Product walkthrough' }} value={title} error={errors.title} onChange={(_, v) => setTitle(v)} />
      {source === 'upload' ? (
        <div>
          <label className="admin-label" htmlFor="video-file">Video file <span className="text-sky-300">*</span></label>
          <input id="video-file" type="file" accept="video/mp4" className="admin-input" onChange={(e) => setFile(e.target.files[0] || null)} aria-describedby="video-file-hint" />
          <p id="video-file-hint" className="admin-hint">MP4 with H.264 video and AAC audio plays in every browser. The file is checked before it can be published; nothing is converted.</p>
          {errors.file && <p className="admin-error">{errors.file}</p>}
        </div>
      ) : (
        <Field field={{ name: 'external_url', label: `${source === 'youtube' ? 'YouTube' : 'Vimeo'} link`, type: 'url', required: true,
                        placeholder: source === 'youtube' ? 'https://www.youtube.com/watch?v=…' : 'https://vimeo.com/…' }}
               value={link} error={errors.external_url} onChange={(_, v) => setLink(v)} />
      )}
      {progress !== null && (
        <div role="status">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-sky-300 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p className="mt-1 text-xs text-slate-400">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : 'Checking the file…'}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="admin-btn admin-btn-primary admin-btn-sm" disabled={progress !== null}>{source === 'upload' ? 'Upload video' : 'Add video'}</button>
        <button type="button" className="admin-btn admin-btn-sm" onClick={onDone} disabled={progress !== null}>Cancel</button>
      </div>
    </form>
  );
};

export const VideoManager = ({ projectId }) => {
  const { rows, run, reorder } = useChildList(projectId, 'videos');
  const [adding, setAdding] = useState(false);
  if (rows === null) return <Spinner />;
  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-slate-400">
        Videos appear on the public page only once they are uploaded, validated and published. With no published video,
        the video section is left out entirely. The primary video is shown first.
      </p>
      {rows.length > 0 && (
        <ul className="grid gap-4">
          {rows.map((video, index) => (
            <VideoCard key={`${video.id}-${video.updated_at}`} video={video} index={index} count={rows.length} projectId={projectId} run={run}
                       reorderBy={(i, delta) => reorder(moveIds(rows, i, delta)).catch(() => {})} />
          ))}
        </ul>
      )}
      {adding ? <AddVideo projectId={projectId} run={run} onDone={() => setAdding(false)} /> : (
        <div><button type="button" className="admin-btn" onClick={() => setAdding(true)}><Film size={15} />Add a video</button></div>
      )}
    </div>
  );
};
