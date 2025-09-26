import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  try {
    const [{ collections }, regions] = await Promise.all([
      listCollections({
        fields: "*products",
      }),
      listRegions(),
    ])

    if (!collections?.length || !regions?.length) {
      return []
    }

    const countryCodes = regions
      .map((region: StoreRegion) =>
        region.countries?.map((country) => country.iso_2).filter(Boolean) ?? []
      )
      .flat()
      .filter(Boolean) as string[]

    if (!countryCodes.length) {
      return []
    }

    const collectionHandles = collections
      .map((collection: StoreCollection) => collection.handle)
      .filter(Boolean) as string[]

    return countryCodes
      .map((countryCode: string) =>
        collectionHandles.map((handle) => ({ countryCode, handle }))
      )
      .flat()
  } catch {
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const metadata = {
    title: `${collection.title} | Medusa Store`,
    description: `${collection.title} collection`,
  } as Metadata

  return metadata
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const collection = await getCollectionByHandle(params.handle).then(
    (collection: StoreCollection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
    />
  )
}
