import { useEffect, useState } from 'react'
import { ImagePlus, Trash2, Upload, X } from 'lucide-react'
import { deleteRequestPhoto, listRequestPhotos, uploadRequestPhoto, type DbRequestPhoto } from '../lib/anyworkApi'

export function RequestPhotos({
  requestId,
  canUpload = false,
}: {
  requestId: string
  canUpload?: boolean
}) {
  const [photos, setPhotos] = useState<DbRequestPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      setPhotos(await listRequestPhotos(requestId))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load request photos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [requestId])

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setError('')

    try {
      const selected = Array.from(files)
      for (const file of selected) {
        await uploadRequestPhoto(requestId, file)
      }
      await load()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload the photo.')
      await load()
    } finally {
      setUploading(false)
    }
  }

  const remove = async (photo: DbRequestPhoto) => {
    try {
      await deleteRequestPhoto(photo)
      setPhotos((current) => current.filter((item) => item.id !== photo.id))
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to remove the photo.')
    }
  }

  return (
    <section className="requestPhotosCard">
      <div className="requestPhotosHeader">
        <div>
          <span className="eyebrow">JOB PHOTOS</span>
          <h2>Visual details</h2>
          <p>{canUpload ? 'Add photos that help providers understand the job before they quote.' : 'Photos shared by the customer for this request.'}</p>
        </div>
        {canUpload && (
          <>
            <input
              id={'request-photo-upload-' + requestId}
              type="file"
              hidden
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading}
              onChange={(event) => {
                void uploadFiles(event.target.files)
                event.currentTarget.value = ''
              }}
            />
            <label className="buttonSecondary requestPhotoAddButton" htmlFor={'request-photo-upload-' + requestId}>
              <ImagePlus size={15} /> {uploading ? 'Uploading…' : 'Add photos'}
            </label>
          </>
        )}
      </div>

      {error && <div className="formError">{error}</div>}

      {loading ? (
        <div className="requestPhotosEmpty">Loading photos…</div>
      ) : photos.length ? (
        <div className="requestPhotosGrid">
          {photos.map((photo) => (
            <figure className="requestPhotoCard" key={photo.id}>
              {photo.signed_url ? <img src={photo.signed_url} alt={photo.file_name} loading="lazy" /> : <div className="requestPhotoMissing"><Upload size={18} /></div>}
              <figcaption>
                <span>{photo.file_name}</span>
                {canUpload && <button type="button" onClick={() => void remove(photo)} aria-label={'Delete ' + photo.file_name}><Trash2 size={13} /></button>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="requestPhotosEmpty">
          <div className="requestPhotosEmptyIcon"><ImagePlus size={20} /></div>
          <strong>No photos yet</strong>
          <span>{canUpload ? 'Add a few photos to help providers quote accurately.' : 'The customer has not added any photos.'}</span>
        </div>
      )}
    </section>
  )
}
