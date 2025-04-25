export enum ImageResolution {
  THUMBNAIL = 'thumbnail',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ORIGINAL = 'original',
}

export type ImageInfoAttribute = {
  sources: { [key in ImageResolution]?: string } & { original: string };
  alt?: string;
  order?: number;
  label?: string;
};

export type ImageInfoData = ImageInfoAttribute;

/**
 * Represents and manages structured image data, including multiple resolutions.
 */
export default class ImageInfoModel {
  protected sources: { [key in ImageResolution]?: string } & { original: string };
  protected alt?: string;
  protected order?: number;
  protected label?: string;

  /**
   * Creates an instance of ImageInfoModel.
   * @param data - The initial image data.
   */
  constructor(data: ImageInfoAttribute) {
    this.sources = { ...data.sources };
    this.alt = data.alt;
    this.order = data.order;
    this.label = data.label;

    if (!this.sources.original) {
        throw ("ImageInfoModel cannot be created without an 'original' source URL.");
    }
  }

  /**
   * Gets the sources object containing URLs for different resolutions.
   * Returns a copy to prevent external modification.
   */
  getSources() {
    return { ...this.sources };
  }

  /**
   * Gets the URL for a specific resolution key.
   * @param resolutionKey - The key of the desired resolution (e.g., 'thumbnail', 'medium').
   * @returns The URL string if the key doesn't exist, otherwise original image URL will be returned.
   */
  getSource(resolutionKey: ImageResolution): string{
    return this.sources[resolutionKey] || this.sources.original;
  }

  /**
   * Gets the alternative text for the image.
   */
  getAlt(): string | undefined {
    return this.alt;
  }

  /**
   * Gets the display order number for the image.
   */
  getOrder(): number | undefined {
    return this.order;
  }

  /**
   * Gets the display label or caption for the image.
   */
  getLabel(): string | undefined {
    return this.label;
  }

  /**
   * Sets the alternative text for the image.
   * @param altText - The new alt text.
   */
  setAlt(altText: string | undefined): void {
    this.alt = altText;
    // Potentially add logic here to trigger updates if needed
  }

  /**
   * Sets the display order for the image.
   * @param order - The new order number.
   */
  setOrder(order: number | undefined): void {
    this.order = order;
  }

   /**
   * Sets the display label for the image.
   * @param label - The new label text.
   */
  setLabel(label: string | undefined): void {
    this.label = label;
  }

  /**
   * Updates or adds a URL for a specific resolution.
   * @param resolutionKey - The key of the resolution to update/add.
   * @param url - The URL for the resolution. Set to undefined to remove.
   */
  setSource(resolutionKey: ImageResolution, url: string | undefined): void {
      if (url === undefined) {
          // Prevent deleting the 'original' key if it's required
          if (resolutionKey === 'original') {
              throw ("Cannot remove the 'original' image source.");
              return;
          }
          delete this.sources[resolutionKey];
      } else {
          this.sources[resolutionKey] = url;
      }
  }

  /**
   * Returns a plain JavaScript object representation of the image info.
   */
  getDetails(): ImageInfoData {
    return {
      sources: this.getSources(),
      alt: this.getAlt(),
      order: this.getOrder(),
      label: this.getLabel(),
    };
  }
}