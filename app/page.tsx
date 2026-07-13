'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchBar } from '@/components/search/SearchBar'
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher'
import { TopicCard, TopicCardGrid } from '@/components/handbook/TopicCard'
import { Badge } from '@/components/ui/badge'
import { useAppStore, useAvailableTopics, useAppLoading, useAppError } from '@/store/useAppStore'
import { useFavoritesStore } from '@/store/useFavoritesStore'
import { Search, Book, Heart, Globe, Shield, Moon, Sun } from 'lucide-react'
import { getCategoryName, getCategoryIcon } from '@/lib/utils'
import type { Topic } from '@/data/schema/topic.schema'

const categories = [
  'sacraments',
  'mary',
  'papacy',
  'salvation',
  'bible',
  'saints',
  'tradition',
  'church-teaching'
] as const

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const { loading, error, initialize, settings, updateSettings } = useAppStore()
  const availableTopics = useAvailableTopics()
  const { loadFavorites } = useFavoritesStore()

  const isDark = settings.theme === 'dark'
  const toggleDark = () => updateSettings({ theme: isDark ? 'light' : 'dark' })

  useEffect(() => {
    // Initialize the app on component mount
    initialize().then(() => {
      // Load favorites after initialization
      loadFavorites()
    }).catch(console.error)
  }, [initialize, loadFavorites])

  // Filter topics based on search and category
  const filteredTopics = availableTopics.filter(topic => {
    const answerText = typeof topic.answer === 'string'
      ? topic.answer
      : `${topic.answer.summary} ${topic.answer.full}`
    const matchesSearch = !searchQuery ||
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      answerText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = !selectedCategory || topic.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Get featured topics for each category
  const getFeaturedTopics = (category: string, limit: number = 1): Topic[] => {
    const categoryTopics = availableTopics.filter(topic => topic.category === category)
    return categoryTopics.slice(0, limit)
  }

  // Get stats for each category
  const getCategoryStats = (category: string) => {
    const categoryTopics = availableTopics.filter(topic => topic.category === category)
    return categoryTopics.length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-catholic-blue mx-auto"></div>
              <p className="text-lg text-muted-foreground">Loading Catholic Faith Defender...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Error Loading Application</CardTitle>
                <CardDescription>{error}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-catholic-blue" />
              <div>
                <h1 className="text-xl font-bold text-catholic-blue">Catholic Faith Defender</h1>
                <p className="text-xs text-muted-foreground">Defending the Faith with Scripture & Tradition</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <SearchBar
                placeholder="Search topics..."
                className="w-64"
                onSearch={(query, results) => setSearchQuery(query)}
              />
              <LanguageSwitcher />
              <Button variant="ghost" size="icon" onClick={toggleDark} title="Toggle dark mode">
                {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-6 py-8">
          <h2 className="text-4xl font-bold text-catholic-blue">
            Defend Your Faith with Confidence
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Access comprehensive Catholic apologetics resources including scripture references,
            Church Fathers quotes, and Catechism citations to help you understand and defend the Catholic faith.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              {availableTopics.length} Topics Available
            </Badge>
            <Badge variant="secondary" className="text-sm">
              English & Tagalog
            </Badge>
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Book className="h-8 w-8 text-catholic-blue mx-auto mb-2" />
              <div className="text-2xl font-bold">{availableTopics.length}</div>
              <div className="text-sm text-muted-foreground">Topics</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Globe className="h-8 w-8 text-catholic-gold mx-auto mb-2" />
              <div className="text-2xl font-bold">2</div>
              <div className="text-sm text-muted-foreground">Languages</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Search className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">∞</div>
              <div className="text-sm text-muted-foreground">Search</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">∞</div>
              <div className="text-sm text-muted-foreground">Favorites</div>
            </CardContent>
          </Card>
        </section>

        {/* Categories Section */}
        <section className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">Browse by Category</h3>
            <p className="text-muted-foreground">Explore topics organized by theological categories</p>
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
              size="sm"
            >
              All Categories
            </Button>
            {categories.map((category) => {
              const count = getCategoryStats(category)
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  size="sm"
                  disabled={count === 0}
                >
                  {getCategoryIcon(category)} {getCategoryName(category)} ({count})
                </Button>
              )
            })}
          </div>

          {/* Featured Topics by Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {categories.map((category) => {
              const featuredTopics = getFeaturedTopics(category)
              if (featuredTopics.length === 0) return null

              return (
                <Card key={category} className="category-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <span className="text-xl">{getCategoryIcon(category)}</span>
                      <span>{getCategoryName(category)}</span>
                    </CardTitle>
                    <CardDescription>
                      {getCategoryStats(category)} topics available
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TopicCardGrid
                      topics={featuredTopics}
                      compact={true}
                      columns={1}
                      onTopicClick={(topic) => {
                        // Navigate to topic detail - to be implemented
                        console.log('Navigate to topic:', topic)
                      }}
                    />
                    {getCategoryStats(category) > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setSelectedCategory(category)}
                      >
                        View All ({getCategoryStats(category) - 1} more)
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>

        {/* All Topics Section */}
        {(searchQuery || selectedCategory) && (
          <section className="space-y-6">
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-2">
                {searchQuery && `Search Results for "${searchQuery}"`}
                {selectedCategory && !searchQuery && `${getCategoryName(selectedCategory)} Topics`}
                {searchQuery && selectedCategory && `${getCategoryName(selectedCategory)}: "${searchQuery}"`}
              </h3>
              <p className="text-muted-foreground">
                {filteredTopics.length} {filteredTopics.length === 1 ? 'topic' : 'topics'} found
              </p>
            </div>

            <TopicCardGrid
              topics={filteredTopics}
              loading={loading}
              onTopicClick={(topic) => {
                // Navigate to topic detail - to be implemented
                console.log('Navigate to topic:', topic)
              }}
              columns={3}
            />

            {filteredTopics.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-lg">
                  No topics found matching your criteria
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory(null)
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}