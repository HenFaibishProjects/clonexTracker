export class TrackPageViewDto {
    path!: string;
    referrer?: string;
    /** Persistent anonymous browser identifier stored in localStorage */
    anonymous_visitor_id?: string;
}