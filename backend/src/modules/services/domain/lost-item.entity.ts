export interface LostItemProps {
  id?: number;
  name: string;
  userId?: number;
  location?: string;
  description?: string;
  lostDate?: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class LostItem {
  private constructor(private props: LostItemProps) {}

  public static create(props: LostItemProps): LostItem {
    return new LostItem(props);
  }

  get id() { return this.props.id; }
  get name() { return this.props.name; }
  get isResolved() { return this.props.isResolved; }

  public resolve() {
    this.props.isResolved = true;
    this.props.resolvedAt = new Date();
  }

  public toJSON() {
    return { ...this.props };
  }
}
