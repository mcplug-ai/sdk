declare global{
  export type MCPLUG_Caca = import("@mcplug/client/ai").InferTools<{
  company_research: {
    IN: {
      /**
       * Company website URL (e.g., 'exa.ai' or 'https://exa.ai')
       */
      query: string;
      /**
       * Number of subpages to crawl (default: 10)
       */
      subpages?: number;
      /**
       * Specific sections to target (e.g., ['about', 'pricing', 'faq', 'blog']). If not provided, will crawl the most relevant pages.
       */
      subpageTarget?: string[];
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  competitor_finder: {
    IN: {
      /**
       * Describe what the company/product in a few words (e.g., 'web search API', 'AI image generation', 'cloud storage service'). Keep it simple. Do not include the company name.
       */
      query: string;
      /**
       * Number of competitors to return (default: 10)
       */
      numResults?: number;
      /**
       * Optional: The company's website to exclude from results (e.g., 'exa.ai')
       */
      excludeDomain?: string;
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  twitter_search: {
    IN: {
      /**
       * Twitter username, hashtag, or search term (e.g., 'x.com/username' or search term)
       */
      query: string;
      /**
       * Number of Twitter results to return (default: 5)
       */
      numResults?: number;
      /**
       * Optional ISO date string (e.g., '2023-04-30T23:59:59.999Z') to filter tweets published before this date. Use only when necessary.
       */
      endPublishedDate?: string;
      /**
       * Optional ISO date string (e.g., '2023-04-01T00:00:00.000Z') to filter tweets published after this date. Use only when necessary.
       */
      startPublishedDate?: string;
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  web_search_tool: {
    IN: {
      /**
       * Search query
       */
      query: string;
      /**
       * Number of search results to return (default: 5)
       */
      numResults?: number;
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  research_paper_search_tool: {
    IN: {
      /**
       * Research topic or keyword to search for
       */
      query: string;
      /**
       * Number of research papers to return (default: 5)
       */
      numResults?: number;
      /**
       * Maximum number of characters to return for each result's text content (Default: 3000)
       */
      maxCharacters?: number;
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
  linkedin_search_tool: {
    IN: {
      /**
       * Search query for LinkedIn (e.g., <url> company page OR <company name> company page)
       */
      query: string;
      /**
       * Number of search results to return (default: 5)
       */
      numResults?: number;
      [k: string]: unknown;
    };
    OUT: {
      results: {
        id: string;
        url: string;
        text: string;
        image?: string;
        score?: number;
        title: string;
        author: string;
        favicon?: string;
        publishedDate: string;
      }[];
      requestId: string;
      autopromptString: string;
      resolvedSearchType: string;
    };
  };
}
>
}
export {}
