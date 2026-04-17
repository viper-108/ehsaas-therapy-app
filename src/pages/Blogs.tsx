import { Calendar, User, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";

const Blogs = () => {
  const blogs = [
    {
      id: 1,
      title: "Understanding Anxiety: Recognizing the Signs and Finding Help",
      excerpt: "Anxiety is one of the most common mental health conditions. Learn to recognize the signs and discover effective coping strategies that can help you manage anxiety in your daily life.",
      content: `Anxiety affects millions of people worldwide, yet many don't recognize the signs or know where to turn for help. This comprehensive guide explores the various forms anxiety can take, from generalized anxiety disorder to panic attacks, and provides practical strategies for management.

Common signs of anxiety include persistent worry, restlessness, difficulty concentrating, and physical symptoms like rapid heartbeat or sweating. It's important to understand that anxiety is a normal human emotion, but when it becomes overwhelming or interferes with daily life, professional help may be needed.

Effective coping strategies include deep breathing exercises, mindfulness meditation, regular exercise, and maintaining a healthy sleep schedule. Cognitive-behavioral therapy (CBT) has proven particularly effective in treating anxiety disorders.

Remember, seeking help is a sign of strength, not weakness. If you're struggling with anxiety, consider reaching out to a mental health professional who can provide personalized guidance and support.`,
      author: "Dr. Priya Sharma",
      date: "2024-01-15",
      readTime: "5 min read",
      category: "Anxiety",
      image: "/api/placeholder/400/200"
    },
    {
      id: 2,
      title: "The Importance of Self-Care in Mental Health",
      excerpt: "Self-care isn't selfish—it's essential. Discover practical self-care strategies that can significantly improve your mental health and overall well-being.",
      content: `Self-care has become a buzzword in recent years, but its importance for mental health cannot be overstated. True self-care goes beyond bubble baths and spa days—it's about creating sustainable practices that support your psychological well-being.

Physical self-care includes regular exercise, adequate sleep, and nutritious eating. These fundamental practices form the foundation of good mental health. When our bodies are healthy, our minds are better equipped to handle stress and challenges.

Emotional self-care involves acknowledging and processing your feelings, setting healthy boundaries, and engaging in activities that bring you joy. This might include journaling, spending time in nature, or pursuing creative hobbies.

Mental self-care focuses on activities that stimulate your mind in positive ways—reading, learning new skills, or engaging in meaningful conversations. It also means being mindful of the media you consume and taking breaks from technology when needed.

Social self-care emphasizes the importance of maintaining healthy relationships and seeking support when needed. This includes saying no to commitments that drain you and yes to connections that energize you.

Remember, self-care looks different for everyone. The key is finding what works for you and making it a regular part of your routine.`,
      author: "Dr. Rajesh Kumar",
      date: "2024-01-10",
      readTime: "7 min read",
      category: "Self-Care",
      image: "/api/placeholder/400/200"
    },
    {
      id: 3,
      title: "Breaking the Stigma: Why Mental Health Conversations Matter",
      excerpt: "Mental health stigma prevents many from seeking help. Learn how we can create more open, supportive conversations about mental health in our communities.",
      content: `Despite significant progress in mental health awareness, stigma remains a major barrier to treatment. Many people still feel shame about their mental health struggles, often describing depression as "feeling weak" or anxiety as "being dramatic."

This stigma has real consequences. Studies show that stigma can prevent people from seeking help, lead to discrimination in employment and housing, and contribute to social isolation. The fear of being judged often keeps individuals suffering in silence.

Language matters immensely in reducing stigma. Instead of saying someone "is bipolar" or "is schizophrenic," we can say they "have bipolar disorder" or "live with schizophrenia." This person-first language emphasizes that mental health conditions are just one aspect of a person's identity.

Education is key to breaking down misconceptions. Mental health conditions are medical conditions, just like diabetes or heart disease. They have biological, psychological, and social components and are not character flaws or signs of weakness.

We can all play a role in reducing stigma by sharing our stories (when comfortable), listening without judgment, and supporting mental health initiatives in our communities. When we normalize conversations about mental health, we create safer spaces for people to seek help.

By working together, we can create a world where seeking mental health support is viewed as a positive step toward wellness, not a source of shame.`,
      author: "Dr. Anita Verma",
      date: "2024-01-05",
      readTime: "6 min read",
      category: "Mental Health Awareness",
      image: "/api/placeholder/400/200"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Mental Health Insights</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Expert insights, practical tips, and inspiring stories to support your mental health journey
            </p>
          </div>

          {/* Featured Blog */}
          <div className="mb-16">
            <Card className="overflow-hidden hover:shadow-large transition-all duration-300">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="relative h-64 lg:h-auto">
                  <img 
                    src={blogs[0].image} 
                    alt={blogs[0].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-primary/90 text-white">Featured</Badge>
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(blogs[0].date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{blogs[0].readTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{blogs[0].author}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mb-3">{blogs[0].category}</Badge>
                  <h2 className="text-2xl font-bold text-foreground mb-4">{blogs[0].title}</h2>
                  <p className="text-muted-foreground mb-6">{blogs[0].excerpt}</p>
                  <Button className="group">
                    Read Full Article
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Blog Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {blogs.slice(1).map((blog) => (
              <Card key={blog.id} className="overflow-hidden hover:shadow-large transition-all duration-300">
                <div className="relative h-48">
                  <img 
                    src={blog.image} 
                    alt={blog.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(blog.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{blog.readTime}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mb-3">{blog.category}</Badge>
                  <h3 className="text-xl font-bold text-foreground mb-3">{blog.title}</h3>
                  <p className="text-muted-foreground mb-4">{blog.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-4 h-4" />
                      <span>{blog.author}</span>
                    </div>
                    <Button variant="outline" size="sm" className="group">
                      Read More
                      <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Newsletter Signup */}
          <div className="mt-20">
            <Card className="bg-gradient-hero p-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Stay Updated with Mental Health Insights
              </h2>
              <p className="text-xl text-white/90 mb-8">
                Subscribe to our newsletter for weekly mental health tips and expert insights
              </p>
              <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-lg border border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
                />
                <Button variant="secondary" size="lg">
                  Subscribe
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Blogs;