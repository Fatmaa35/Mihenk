import { FormEvent, useState } from 'react'
import { BadgeCheck, CornerDownRight, Flag, Star, ThumbsUp, Trash2, UserPlus, UserCheck } from 'lucide-react'
import {
  useBookCommunity, useCreateComment, useDeleteComment, useRateBook, useToggleFollow, useToggleHelpful,
} from '../../shared/api/community'
import type { BookComment } from '../../shared/api/types'
import { Button, ErrorState, Skeleton, useToast } from '../../shared/ui'
import { formatRelative } from '../../spa/format'
import { ReportDialog } from './ReportDialog'
import { SpoilerText } from './SpoilerText'
import './community.css'

function StarRating({ bookId, value }: { bookId: string; value: number | null }) {
  const rate = useRateBook(bookId)
  const { notify } = useToast()
  const [hover, setHover] = useState(0)
  const shown = hover || value || 0
  return (
    <div className="stars" role="radiogroup" aria-label="Puanın" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} yıldız`}
          className={`stars__star${star <= shown ? ' is-on' : ''}`}
          disabled={rate.isPending}
          onMouseEnter={() => setHover(star)}
          onClick={() => rate.mutate(star, { onSuccess: () => notify('Puanın kaydedildi.', 'success'), onError: (error) => notify(error.message, 'error') })}
        >
          <Star size={26} fill={star <= shown ? 'currentColor' : 'none'} aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}

function CommentItem({ comment, bookId, onReply, onReport }: { comment: BookComment; bookId: string; onReply: () => void; onReport: () => void }) {
  const helpful = useToggleHelpful(bookId)
  const follow = useToggleFollow(bookId)
  const remove = useDeleteComment(bookId)
  const { notify } = useToast()
  const fail = (error: Error) => notify(error.message, 'error')
  return (
    <li className={`comment${comment.parent_comment_id ? ' comment--reply' : ''}`}>
      <header className="comment__head">
        <strong>{comment.author.display_name}</strong>
        {comment.author.is_verified && <BadgeCheck size={16} className="comment__verified" aria-label={comment.author.verification_label ?? 'Doğrulanmış okur'} />}
        <time dateTime={comment.created_at}>{formatRelative(comment.created_at)}</time>
      </header>
      <SpoilerText text={comment.content} spoiler={comment.contains_spoiler && !comment.is_mine} />
      <div className="comment__actions">
        <button type="button" className="text-action" aria-pressed={comment.own_helpful} onClick={() => helpful.mutate(comment, { onError: fail })} disabled={helpful.isPending || comment.is_mine}>
          <ThumbsUp size={15} fill={comment.own_helpful ? 'currentColor' : 'none'} aria-hidden="true" /> Faydalı · {comment.helpful_count}
        </button>
        {!comment.parent_comment_id && (
          <button type="button" className="text-action" onClick={onReply}><CornerDownRight size={15} aria-hidden="true" /> Yanıtla</button>
        )}
        {comment.is_mine ? (
          <button type="button" className="text-action text-action--danger" onClick={() => remove.mutate(comment.id, { onSuccess: () => notify('Yorumun silindi.', 'success'), onError: fail })} disabled={remove.isPending}>
            <Trash2 size={15} aria-hidden="true" /> Sil
          </button>
        ) : (
          <>
            <button type="button" className="text-action" onClick={() => follow.mutate({ userId: comment.author_id, following: comment.following_author }, { onError: fail })} disabled={follow.isPending}>
              {comment.following_author ? <UserCheck size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
              {comment.following_author ? 'Takip ediliyor' : 'Takip et'}
            </button>
            <button type="button" className="text-action" onClick={onReport}><Flag size={15} aria-hidden="true" /> Şikâyet et</button>
          </>
        )}
      </div>
    </li>
  )
}

/** Kitap detayındaki puan + yorum alanı. Yanıtlar ait oldukları yorumun hemen altında gösterilir. */
export function BookCommunityPanel({ bookId }: { bookId: string }) {
  const community = useBookCommunity(bookId)
  const create = useCreateComment(bookId)
  const { notify } = useToast()
  const [replyTo, setReplyTo] = useState<BookComment | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    create.mutate(
      { content: String(form.get('content') ?? '').trim(), contains_spoiler: form.get('spoiler') === 'on', parent_comment_id: replyTo?.id ?? null },
      {
        onSuccess: () => { formElement.reset(); setReplyTo(null); notify(replyTo ? 'Yanıtın yayınlandı.' : 'Yorumun yayınlandı.', 'success') },
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }

  if (community.isPending) return <div className="stack"><Skeleton height={60} /><Skeleton height={90} /></div>
  if (community.isError) return <ErrorState message={community.error.message} onRetry={() => community.refetch()} />
  const data = community.data
  const roots = data.comments.filter((comment) => !comment.parent_comment_id)
  const replies = (id: string) => data.comments.filter((comment) => comment.parent_comment_id === id)
  const max = Math.max(1, ...Object.values(data.rating_distribution))

  return (
    <div className="book-community">
      <section className="rating-summary" aria-label="Okur puanları">
        <div className="rating-summary__score">
          <strong>{data.rating_count ? data.rating_average.toFixed(1) : '—'}</strong>
          <span>{data.rating_count ? `${data.rating_count} okur puanı` : 'Henüz puan yok'}</span>
        </div>
        <ul className="rating-summary__bars" aria-label="Puan dağılımı">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = data.rating_distribution[String(star)] ?? 0
            return (
              <li key={star}>
                <span>{star}</span>
                <span className="bars__track"><span className="bars__fill" style={{ width: `${(count / max) * 100}%` }} /></span>
                <small>{count}</small>
              </li>
            )
          })}
        </ul>
        <div className="rating-summary__mine">
          <span>{data.own_rating ? 'Senin puanın' : 'Sen de puan ver'}</span>
          <StarRating bookId={bookId} value={data.own_rating} />
        </div>
      </section>

      <form className="comment-form" onSubmit={submit}>
        {replyTo && (
          <p className="comment-form__reply">
            <span><strong>{replyTo.author.display_name}</strong> adlı okura yanıt veriyorsun</span>
            <button type="button" className="text-action" onClick={() => setReplyTo(null)}>Vazgeç</button>
          </p>
        )}
        <label className="visually-hidden" htmlFor={`comment-${bookId}`}>Yorumun</label>
        <textarea id={`comment-${bookId}`} name="content" className="mh-input mh-textarea" rows={3} minLength={2} maxLength={2000} required placeholder="Bu kitap sende ne bıraktı?" />
        <div className="comment-form__footer">
          <label className="check-row"><input type="checkbox" name="spoiler" /> Spoiler içeriyor</label>
          <Button type="submit" size="sm" loading={create.isPending}>{replyTo ? 'Yanıtla' : 'Paylaş'}</Button>
        </div>
      </form>

      {roots.length === 0 ? (
        <p className="today__muted">İlk yorumu sen paylaş.</p>
      ) : (
        <ul className="comment-list">
          {roots.map((comment) => (
            <li key={comment.id} className="comment-thread">
              <ul className="comment-list">
                <CommentItem comment={comment} bookId={bookId} onReply={() => setReplyTo(comment)} onReport={() => setReportId(comment.id)} />
                {replies(comment.id).map((reply) => (
                  <CommentItem key={reply.id} comment={reply} bookId={bookId} onReply={() => setReplyTo(comment)} onReport={() => setReportId(reply.id)} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      <ReportDialog commentId={reportId} onClose={() => setReportId(null)} />
    </div>
  )
}
