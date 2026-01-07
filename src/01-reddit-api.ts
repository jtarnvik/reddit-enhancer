namespace RedditApi {
// Reddit API envelope
  export interface RedditListing {
    kind: "Listing";
    data: {
      children: RedditThing[];
    };
  }

  export interface RedditThing {
    kind: "t3";
    data: RedditPost;
  }

  export interface RedditPost {
    id: string;
    name: string; // t3_xxxxx
    title: string;
    selftext: string;
    url: string;

    is_gallery?: boolean;

    preview?: {
      images: Array<{
        source: {
          url: string;
          width: number;
          height: number;
        };
        caption?: string;
      }>;
    };

    media_metadata?: {
      [key: string]: {
        status: string;
        caption?: string;
        p?: Array<{
          u: string;
          x: number;
          y: number;
        }>;
        s?: {
          u: string;
          x: number;
          y: number;
        };
      };
    };
  }
}