import type { AlbumMeta } from '~/albums'

/**
 * 画廊分组示例
 *
 * 画廊分组：子画廊就是本文件夹下的子文件夹（每个子文件夹一个 album.ts）。
 */
export default {
    id: 'demo-group',
    cover: 'https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/t_251203145913_%E8%BE%89%E5%A4%9C2.jpg',
    caption: '画廊分组示例',
    desc: '分组可以无限嵌套，里面能放任意类型的画廊',
    order: 1000,
} satisfies AlbumMeta
