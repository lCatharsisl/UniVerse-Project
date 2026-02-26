export type ItemType = 'lost' | 'found';

export interface CommentProps {
  id?: number;
  userId: number;
  itemType: ItemType;
  itemId: number;
  content: string;
  createdAt?: Date;
}

export class Comment {
  private constructor(private props: CommentProps) {}

  public static create(props: CommentProps): Comment {
    return new Comment(props);
  }

  get id() { return this.props.id; }
  get userId() { return this.props.userId; }
  get itemType() { return this.props.itemType; }
  get itemId() { return this.props.itemId; }
  get content() { return this.props.content; }
  get createdAt() { return this.props.createdAt; }

  public toJSON() {
    return { ...this.props };
  }
}
