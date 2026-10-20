import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import { getArtistById } from '@/lib/content/artists'

export const revalidate = 60

export default async function ArtistPage({ params: routeInput }: { params: Promise<{ id: string }> }) {
  const params = await routeInput
  let artist
  try { artist = await getArtistById(params.id) }
  catch (error) {
    console.error('Unable to load artist', error instanceof Error ? error.message : 'Unknown error')
    notFound()
  }
  if (!artist) notFound()

  return <>
    <main className="artist-page">
      <Link className="brand" href="/">Lips<span>.</span></Link>
      <article className="artist-profile">
        <div className="artist-portrait"><Image src={artist.image} alt={artist.name} width={artist.imageWidth ?? 800} height={artist.imageHeight ?? 1000} unoptimized/></div>
        <div className="artist-biography">
          <p className="micro">{artist.role ?? 'THE LINEUP'}</p>
          <h1>{artist.name}</h1>
          <div className="artist-description" dangerouslySetInnerHTML={{ __html: artist.description }}/>
          <Link className="outline-button" href="/#lineup">← BACK TO LINEUP</Link>
        </div>
      </article>
    </main>
    <SiteFooter/>
  </>
}
