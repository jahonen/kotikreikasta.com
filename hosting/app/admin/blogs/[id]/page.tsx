import React from 'react';
import BlogEditor from '../../../../components/admin/BlogEditor';

export default function EditBlogPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  return (
    <div>
      <BlogEditor initialId={id} />
    </div>
  );
}
