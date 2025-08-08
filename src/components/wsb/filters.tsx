"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Filter, Search } from 'lucide-react'

export default function Filters() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Tabs defaultValue="all">
        <TabsList className="bg-zinc-900/60">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="viral">Viral</TabsTrigger>
          <TabsTrigger value="hot">Hot</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <div className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search posts..."
            className="pl-9 bg-zinc-900/60 border-emerald-500/15 focus-visible:ring-emerald-500/30"
            defaultValue=""
          />
        </div>
        <Button variant="outline" className="border-emerald-500/20 bg-zinc-900/60 hover:bg-zinc-900/80">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>
    </div>
  )
}
