---
title: 'PBR基础'
date: 2026-10-06
updated: 2026-10-06
categories: UnityShader杂烩
cover: https://images.cnblogs.com/cnblogs_com/blogs/858247/galleries/2486318/o_251204051842_bg-blog5.jpg
tags:
  - Shaderlab
  - TA
  - 图形学
  - PBR
top: 1
---

:::info
观前必看：

[前置基础知识（必看）](https://zhuanlan.zhihu.com/p/605285200)

如果你了解什么是立体角、辐射通量、辐照度、辐射率，可以跳过。

[拓展阅读-迪士尼原则的BRDF与BSDF相关总结](https://zhuanlan.zhihu.com/p/60977923)

:::

PBR的基础知识，学起来也是相当枯燥的一章。

# 基于物理的渲染理念
关于基于物理的渲染理念，其实跟图形学中对几何体的建模尺度有一定关联。图形学中，对几何体外观的建模，总会假设一定的建模尺度和观察尺度：

+ **宏观尺度（Macroscale）**，几何体通过三角形网格进行建模, 由顶点法线（Vertex Normal）提供每顶点法线信息
+ **中尺度（Mesoscale）**，几何体通过纹理进行建模，由法线贴图（Normal Map）提供每像素法线信息
+ **微观尺度（Microscale）**，几何体通过BRDF进行建模，由粗糙度贴图（Roughness Map）配合法线分布函数，提供每亚像素（subpixel）法线信息

<!-- 这是一张图片，ocr 内容为： -->
![PBR物体的渲染建模。从左到右：渲染后物体，几何体三角形网格，法线贴图，粗糙度贴图](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782761080946-3ecbc7e7-9a45-4084-a991-eb41ad2a2a51.png)

传统光照模型中，一般只将几何体建模到中尺度的法线贴图（Normal Map）层面。虽说Blinn-Phong等分布也是基于微平面理论推导而来，但并没有配套粗糙度贴图（Roughness Map）为其提供亚像素级精度的细节，而且传统的NDF一般都没有经过归一化，不满足能量守恒，容易出现失真。

而在基于物理的渲染工作流中，通过将粗糙度贴图（Roughness Map）与微平面归一化的法线分布函数结合使用，将需渲染的几何体的建模尺度细化到了微观尺度（Microscale）的亚像素层面，对材质的微观表现更加定量，所以能够带来更加接近真实的渲染质量和更全面的材质外观质感把控。如下图：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782761147443-293d37c3-8bd9-42b4-80e8-28849edeea10.png)

# 微观几何
## 光与表面之间的交互
<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782060159643-9cc1e27a-696d-4579-ba20-e917c694ec60.png)

我们从图中可以看出如下这个在这里发生如下操作：

+ **反射(Reflection)**：在物体表面直接反射，我们一般称之为镜面反射。
+ **折射(Refraction)**：从表面折射入介质的光，会发生吸收(absorption)和散射(scattering)等，而介质的整体外观由其散射和吸收特性的组合决定。
+ **散射(Scattered)**：折射率的快速变化引起散射，在介质内部发生会造成光的方向会改变到各个方向。散射最终被视作的类型与观察尺度有关。散射距离：入射点到出射点的距离。观察像素： 屏幕上 1 个像素，对应**物体表面真实世界的物理宽度**
    - **次表面散射(Subsurface Scattering，SSS)**：观察像素小于散射距离。光子在内部微小颗粒之间来回反弹，不同波长光被吸收程度不同，会产生**颜色偏移**（比如皮肤红光穿透更深，背光泛红）; 散射后的光子从表面另一个位置穿出，形成柔和漫反射光，这部分就是**次表面散射光。** 关键特征：入射点≠出射点。普通 BRDF 只能描述「同一点入射、同一点出射」的表面反射，完全无法模拟这种跨位置透光效果，因此次表面散射需要用 **BSSRDF（双向次表面反射分布函数）** 描述，是 BRDF 的扩展。
    - **漫反射(Diffuse)**：观察像素大于散射距离，散射被视作**漫反射**。局部着色模型处理即可。
+ **透射(Transmission)**：入射光经过折射穿过物体后的出射现象。一般在透明物体出现，需要引入BTDF来单独处理。
+ **吸收(Absorption)**：具有复折射率的物质区域会引起吸收，具体原理是光波频率与该材质原子中的电子振动的频率相匹配。复折射率（complex number）的虚部（imaginary part）确定了光在传播时是否被吸收（转换成其他形式的能量）。发生吸收的介质的光量会随传播的距离而减小（如果吸收优先发生于某些波长，则可能也会改变光的颜色），而光的方向不会因为吸收而改变。任何颜色色调通常都是由吸收的波长相关性引起的。

## 光与不同物质之间的交互
一半分为两种情况，与金属物体的交互和与非金属物体的交互。

与金属物体表面交互时，折射光会立刻被吸收，能量被自由电子吸收，不会散射出来；

与非金属物体表面交互时，折射光就表现为常规的介质交互，有吸收也有散射，折射光会在经过部分吸收后，从表面重新射出。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781891434209-a2892d39-a020-4498-9add-f29d60722a90.png)

## 次表面散射
在渲染中一般将表面反射认作为specular，而diffuse实际上与次表面散射是同一种现象，本质都是次表面散射的结果。唯一的区别是相对于观察尺度的散射距离。散射距离相较于像素来说微不足道，可以近似于入射点=出射点，次表面散射便可以近似为漫反射。也就是说，光的折射现象，建模为漫反射还是次表面散射，取决于观察的尺度。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781888251875-cca3fbd0-2f03-4f5d-af1f-f39e797f9713.png)

看左上角的，绿色的大圈就认为是一个像素映射到平面后的大小，这个时候所有进入表面内部都是在这个圈内出射的，这部分由于距离入射点很近所以就直接认为是从入射点出去的，也就是右上角的图，这部分就是可以近似为常见的漫反射，用局部着色模型处理。

下方的图这个内部光线出去时的出射点距离入射点就比较远了，就超出了绿色圈的范围，如果为了更加真实的着色效果。这部分就需要单独作为次表面散射来处理。

## BXDF
**双向散射分布函数(Bidirectional Scatter Distribution Function,BSDF)**。它由两部分构成：**双向反射分布函数(Bidirectional Reflectance Distribution Function,BRDF)**和**双向透射分布函数(Bidirectional Transmission Distribution Function,BTDF)**。**BSSRDF(bidirectional subsurface scattering reflection distribution function，双向次表面散射反射分布函数)** 在上述这些BxDF中，BRDF最为简单，也最为常用。因为游戏和电影中的大多数物体都是不透明的，用BRDF就完全足够。而BSDF、BTDF、BSSRDF往往更多用于半透明材质和次表面散射材质。如下图所示。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782060055763-0f4c1c6e-4bf3-4d39-8ab2-25f99c86e27f.png)

# BRDF 双向反射分布模型
Bidirectional Reflectance Distribution Function  

描述**表面如何将入射光反射到各个观察方向**的函数，已知法线，输入入射方向、出射方向，输出反射能量比例。  

BRDF$f_r(l, v)$反射能量比例由以下公式得到：

$$f_r(l, v) = \frac{dL_o(v)}{dE(l)}$$

$f_r$中的$r$的含义是 Reflection，表示这是反射函数。其中$l$是入射光线方向，$v$是出射视角方向，$L_o(v)$表示上半球所有方向的入射光线的贡献得到的出射方向的反射**辐射率（Radiance）**，而$dL_o(v)$表示来自于光线$l$贡献的反射**辐射率（Radiance）**;$E(l)$是指表面接受到的来自上半球所有方向的入射光线贡献的**辐照度（Irradiance）** 总和，而$dE(l)$特指来自于光线$l$方向贡献的**辐照度（Irradiance）**。

$f_r(l, v)$由两部分组成：漫反射项$f_{diff}$和 镜面反射项$f_{spec}$，即：

$$f_r=k_df_{diff}+k_sf_{spec}$$

$k$表示各部分的比例。



## 漫反射项
### Lambertian BRDF
最基础的漫反射是使用Lambert漫反射模型或者是半Lambert漫反射模型。但正常的Lambert漫反射无法满足PBR的能量守恒原则。于是引入了Lambertian漫反射模型。

**Lambertian假设**：假设光线进入内部后，在**无限小** 的距离内就被完全均匀地打散并从同一个点射出来。因为散射极其充分，所以**出射光的方向与入射方向彻底无关**，只跟有多少总能量（反照率颜色ρ）有关。

公式如下：

$$f_{diff}=\frac{\rho}{\pi}$$

公式极其简单，$\rho$是表面的基础色（反照率），$\pi$是为了保证”能量守恒“而作的归一化处理，也就是说反射出的能量不能大于接受的能量。结果是一个常数。

:::info
**反照率（Albedo）**：专门指**漫反射** 部分的基础颜色。它代表光线进入物体内部，被吸收和散射后，最终漫射出来的颜色。属于**反射率** 的一种

+ 如果$ρ=1$，代表**纯白**，即所有颜色都“100% 反射”（不吸收）。
+ 如果$ρ=0.5$，代表**灰色**，即所有颜色都“50% 反射”（吸收了一半能量）。
+ 如果$ρ=(0.9,0.2,0.2)$，代表**红色**，即红光反射 90%，绿蓝光只反射 20%。

:::

**推导：**

首先漫反射是一个均匀向各个方向反射的一个现象。因此漫反射的BRDF一定是一个常数，假设入射光是均匀且遍布整个半球方向，即也是一个常数，可以得到：

$$L_o(\omega_o)=\int_{\Omega}f_{diff}L_i(\omega_i)cos\theta_id\omega_i
=f_{diff}L_i\int_{\Omega}cos\theta_id\omega_i$$

这里$\Omega$是指整个上半球，因为是对一个抽象的入射方向$d\omega_i$积分，所以使用了抽象的范围表示积分区间。

由于假设入射光是均匀且遍布整个上半球方向，所以$L_o$与方向无关且等于$L_i$。或者换种说法，假设表面是一个纯白色的粗糙表面，白色$\rho$为1，也就是暂不考虑$\rho$值，纯白色不吸收任何光，所以入射亮度会等于出射亮度。所以可以从等式两边消去：

$$f_{diff}\int_{\Omega}cos\theta_id\omega_i=1$$

因为$d\omega=\frac{dA}{r^2}$和$dA=(r·d\theta)(rsin\theta·d\phi)=r^2sin\theta d\theta d\phi$得到$d\omega=sin\theta d\theta d\phi$，带入得：

$$f_{diff}\int^{2\pi}_{0}d\phi_i\int^{\frac{\pi}{2}}_{0}cos\theta_isin\theta_id\theta_i=1$$

这里因为积分的对象改变了，所以相应的积分区域也会发生了改变。$\phi$是水平角，有360°，也就是$2\pi$；$\theta$是垂直角，因为是半球，所以只有90°，也就是$\frac{\pi}{2}$。

根据正弦二倍角公式：$sin2\theta=2sin\theta cos\theta$得到$sin\theta cos\theta=\frac{1}{2}sin2\theta$，代入上式得：

$$\frac{1}{2}f_{diff}\int^{2\pi}_{0}d\phi_i\int^{\frac{\pi}{2}}_{0}sin2\theta_i d\theta_i=1$$

因为$\int^{2\pi}_{0}d\phi_i=2\pi$，$\int^{\frac{\pi}{2}}_{0}sin2\theta_i d\theta_i=-\frac{1}{2}×cos(2×\frac{\pi}{2})-(-\frac{1}{2})×cos(2×0)=1$

所以，最后化简为：

$$\frac{1}{2}f_{diff}×2\pi=1$$

即：

$$f_{diff}=\frac{1}{\pi}$$

由于之前我们视为纯白色表面，没有考虑能量被吸收，将反照率考虑进来之后，得到最终的漫反射BRDF：

$$f_{diff}=\frac{\rho}{\pi}$$

Lambertian BRDF不仅性能好，而且和复杂模型的效果也非常接近。我们这里的漫反射项的计算没有考虑材质表面粗糙度以及材质表面的镜面反射对漫反射的影响。迪士尼和 Oren-Nayar 的 BRDF 模型考虑了上述影响，他们的模型会在掠射角产生逆向反射。我们这里不这样做首先是因为这样做会产生额外的计算代价，但效果提升却不太明显。其次是复杂的漫反射模型也让 IBL 和球谐光照的实现变得更加困难。

**局限性：**

+ **太“平”**：因为亮度不随视角变化，纯Lambertian材质的立体感很强，但缺乏真实感（真实物体表面多少有些微粗糙变化）。
+ **无法表现边缘透光**：当强光从背后照射时，Lambertian只能算出背面是黑的，但像**耳朵、手指** 这类SSS材质，边缘会透出红光——这就必须用我们之前说的**次表面半径** 参数来计算，而不是用简单的$\frac{\rho}{\pi}$了。



---



### Disney 漫反射 BRDF
上面我们说过了，传统的 Lambertian BRDF就是简单的$\frac{\rho}{\pi}$（能量守恒下的常数），但这在物理上是不准确的。

于是迪士尼根据真实数据发现粗糙的材质（如布料、未抛光木材）在**掠射角（视线贴着表面）** 看时，反射率并不是恒定的，而是**明显变亮了**（称为“回射效应”，Retro-reflection）。

于是借助了**Schlick 近似**（Schlick 1994年提出的菲涅耳近似），提出了 Disney Diffuse（**漫反射部分的 Schlick 菲涅耳近似**）：

$$f_{diff}=\frac{\rho}{\pi}(1+(F_{D90}-1)(1-cos\theta_i)^5)(1+(F_{D90}-1)(1-cos\theta_o)^5)$$

其中$\theta_i$是入射光线与法线的夹角，$\theta_o$是视角方向（出射光线）与法线的夹角，$F_{D90}$**是漫反射在掠射角（90度）时的反射率。**

**光照角度因子$(1+(F_{D90}-1)(1-cos\theta_i)^5)$：**

+ 当光线**垂直** 照射$cos\theta_i=1$时，$(1-1)^5=0$，这个因子变成$1+0=1$，不影响基础色。
+ 当光线**倾斜** 照射$cos\theta_i\rightarrow0$时，$(1-0)^5=1$，这个因子变成$1+(F_{D90}-1)=F_{D90}$，漫反射强度会变成$F_{D90}$倍。

**视线角度因子$(1+(F_{D90}-1)(1-cos\theta_o)^5)$：**

+ 当视线**垂直** 观察$cos\theta_o=1$时，$(1-1)^5=0$，这个因子变成$1+0=1$，不影响基础色。
+ 当视线**倾斜** 观察$cos\theta_o\rightarrow0$时，$(1-0)^5=1$，这个因子变成$1+(F_{D90}-1)=F_{D90}$，漫反射强度会变成$F_{D90}$倍。

其中$F_{D90}$通常是由粗糙度推导得出，公式如下：

$$F_{D90}=0.5+2×roughness×cos^2\theta_{h}$$

其中$roughness$是粗糙度，注意要与后面的$\alpha$区分开，$\alpha$是$roughness^2$；$\theta_h$是光线方向与视角方向的半角方向与法线的夹角。

这是一个经验公式，故不需要什么推导。



---

  


## 镜面反射项 DFG项
### Cook-Torrance Specular DFG的应用
Torrance-Sparrow基于微表面理论，用后文将要讲述的三个函数建立了镜面反射BRDF模型。这个模型后来由Cook-Torrance引入计算机图形学，也被称为Cook-Torrance模型。Cook-Torrance BRDF 具体公式：

$$f_{spec}(l,v)=\frac{F(l,h)G(l,v)D(h)}{4cos\theta_lcos\theta_v}=\frac{F(l,h)G(l,v)D(h)}{4(n·l)(n·v)}$$

其中$v$为视角方向（反射方向），$l$为入射光方向，$n$为表面法线，$h$为半角方向

但这种表达方式在物理学上不太严谨，因为我们这里的入射光和反射光准确来说都说立体角方向，所以应该使用$\omega_i$表示入射立体角方向，$\omega_o$表述反射立体角方向（视角方向），下标$i$和$o$表示 incoming（入射）和outgoing（出射）；$\omega_h$表示半角立体角方向，也是微表面法线所限制在的立体角范围，有以下公式：

$$f_{spec}(\omega_i,\omega_o)=\frac{F(\omega_i,\omega_h)G(\omega_i,\omega_o)D(\omega_h)}{4cos\theta_icos\theta_o}=\frac{F(\omega_i,\omega_h)G(\omega_i,\omega_o)D(\omega_h)}{4(n·\omega_i)(n·\omega_o)}$$

其中，$\theta_i$表示入射光方向$\omega_i$与宏观表面法线$n$的夹角，$\theta_o$表示反射方向$\omega_o$与宏观表面法线$n$的夹角。$F$表示菲涅耳反射项，$G$表示几何函数、阴影遮蔽函数，$D$表示法线分布函数。这三个具体都是什么，我们之后会说到。

**推导：**

假设一束光照射到一个微表面上，入射光方向为$\omega_i$，视角观察方向为$\omega_o$，对反射到$\omega_o$方向的反射光有贡献的微表面法线为半角立体角向量$\omega_h$。

根据辐射率与辐射通量之间的公式$L=\frac{d\Phi}{d\omega dA^{\perp}}$以及$dA^{\perp}=cos\theta dA$得：

$$d\Phi_h=L_i(\omega_i)d\omega_idA^{\perp}(\omega_h)=L_i(\omega_i)d\omega_icos\theta_hdA(\omega_h)$$

其中$dA(\omega_h)$是微表面法线在半角立体角$\omega_h$中的微分微表面面积，$dA^{\perp}(\omega_h)$为$dA(\omega_h)$在与入射光线垂直的面上的投影。$\theta_h$为入射光线$\omega_i$与微表面朝向$\omega_h$的法线的夹角，如下图

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781899256754-a3a69345-6d86-4db1-b31f-c2bde65c8d86.png)

把$dA(\omega_h)=D(\omega_h)d\omega_hdA$带入得到：

$$d\Phi_h=L_i(\omega_i)d\omega_icos\theta_hD(\omega_h)d\omega_hdA$$

微表面是光学平坦表面，所以反射光线遵循菲涅耳定理，则反射光的辐射通量为：

$$d\Phi_o=F(\omega_o)d\Phi_h$$

根据辐射率与辐射通量之间的公式$L=\frac{d\Phi}{d\omega dA^{\perp}}$以及$dA^{\perp}=cos\theta dA$还有以上公式得：

$$dL_o(\omega_o)=\frac{d\Phi_o}{d\omega_ocos\theta_odA}=\frac{F(\omega_o)L_i(\omega_i)d\omega_icos\theta_hD(\omega_h)d\omega_hdA}{d\omega_ocos\theta_odA}$$

由BRDF定义和$dE=Lcos\theta d\omega$得到：

$$f_{spec}(\omega_i,\omega_o)=\frac{dL_o(\omega_o)}{dE_i(\omega_i)}=\frac{dL_o(\omega_o)}{L_i(\omega_i)cos\theta_id\omega_i}=\frac{F(\omega_o)cos\theta_hD(\omega_h)d\omega_h}{cos\theta_icos\theta_od\omega_o}$$

:::info
因为$L=\frac{d\Phi}{d\omega dA^{\perp}}=\frac{d\Phi}{d\omega cos\theta dA}$，$E=\frac{d\Phi}{dA}$

所以$L=\frac{dE}{d\omega cos\theta}$

$dE=Ld\omega cos\theta$

:::

我们知道在渲染方程$L_o(\omega_o)=\int_{\Omega}f(\omega_i,\omega_o)L_i(\omega_i)cos\theta_id\omega_i$是对$d\omega_i$的积分，所以方程中不能存在$d\omega_o$和$d\omega_h$作干扰，我们需要对$f_{spec}(\omega_i,\omega_o)$做化简，把$d\omega_o$和$d\omega_h$消去。希望可以找到$\frac{\omega_h}{\omega_o}$的关系。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/jpeg/61442912/1781936832716-dfbff76b-e33f-4187-90ec-6657289a8c9c.jpeg)

如上图所示，入射光与微表面相交于$O$点，与单位上半球相交于$I$点，出射光线与h单位上半球相交于$R$点。由于微表面都说镜面反射，所以法线等同于半角向量$h$

由立体角的定义$\omega=\frac{dA}{r^2}$可得，反射立体角$d\omega_o$等于反射立体角和单位上半球的相交$dA_o$的面积大小。同理，半角（法线）立体角$d\omega_h$等于半角立体角和单位上半球相交的$dA_h$的面积大小。故求$\frac{\omega_h}{\omega_o}$等于求$\frac{dA_h}{dA_o}$，也就是两个相交面积的比值

连接$IR$相交半角（法线）方向$h$于点$P$，由于是半角向量，我们轻松可得$IR=2IP=2PR$

在这个图中，我们还需要理解一件事情，半角（法线）立体角$d\omega_h$所形成的那个圆锥中，法线可能是其中的任意一条线，当法线为圆锥最左边的边线时，出射方向相应的也会变成反射立体角$d\omega_o$所形成的圆锥体的最左边的的边线。同理，法线是圆锥最右边的边线也是一样。这样我们就可以理解为什么，$I$与$dA_o$两头形成的连线一定经过$d\omega_h$圆锥的两边。

所以，图中$dA^{\prime}_h$与$dA_o$的半径的比值关系也等于$\frac{IP}{IR}=\frac{1}{2}$，又因为圆的面积公式为$\pi r^2$，和半径的平方成正比，所以$\frac{dA^{\prime}_h}{dA_o}=\frac{1}{4}$

因为单元球的半径为1，所以连线$OR=OQ=1$，由因为入射角等于反射角等于$cos\theta_h$，所以$OP=cos\theta_hOR=cos\theta_h$。由相似可以得到

$$\frac{dA^{\prime\prime}_h}{dA^{\prime}_h}=\frac{1}{cos^2\theta_h}$$

结合之前的结果可得：

$$\frac{dA^{\prime\prime}_h}{dA_o}=\frac{1}{4cos^2\theta_h}$$

由于$dA_h$相当于$dA^{\prime\prime}_h$在与半角（法线）方向垂直的面上的投影，所以

$$dA^{\prime\prime}_h=\frac{dA_h}{cos\theta_h}$$

所以：

$$\frac{dA_h}{dA_o}=\frac{1}{4cos\theta_h}$$

我们代回到之前求得到$f_{spec}(\omega_i,\omega_o)$中得：

$$f_{spec}(\omega_i,\omega_o)=\frac{F(\omega_o)D(\omega_h)}{4cos\theta_icos\theta_o}$$

最后加上几何函数项G，得到完整的Cook-Torrance BRDF：

$$f_{spec}(\omega_i,\omega_o)=\frac{F(\omega_i,\omega_h)G(\omega_i,\omega_o)D(\omega_h)}{4cos\theta_icos\theta_o}$$

### D：法线分布函数**(Normal Distribution Function)**
当一个入射光$l$打到一个表面上，由于宏观表面是由无数个微表面构成，每个微表面的法线$m$各不相同，所以得到的反射方向也各不相同。只有反射方向与视角方向$v$一致时，这个反射光线才能被我们所看到。

也就是说一个入射光$l$打到一个表面上后，不是所有的反射光线都能被我们所看到。那么我们该怎么确定有多少反射光线能被我们所接收到呢？我们可以先思考，当视角方向和入射光方向不变的时候，我们可以利用它们的半角向量$h$与各个微表面法线$m$做比较来判断是否能够被我们所接受。这时候我们就使用**法线分布函数**‌(Normal Distribution Function, NDF)，用于描述微表面模型中微观几何表面法线与半角向量同向的概率分布。

:::info
法线分布函数写作$D(h)$，可以理解为微表面中法线方向为$h$的面积，但是我们在应用的时候还需要一些限制：

+ **单位宏观面积**，$D(h)$针对宏观着色微元$dA$，代表**单位宏观面积**内，法线为$h$的所有微平面总面积。 
+ **单位立体角**$d\omega_h$， 微平面法线是连续分布，不存在法线严格等于某固定向量的微平面，必须引入范围区间。 所以我们求在**单位立体角**$d\omega_h$范围里面的法线。

这时我们就得到了$D(h)$的最终定义：

每单位宏观面积、每单位立体角内，法线为$h$的微平面总面积。

可以得到以下公式：

$$dA(\omega_h)=D(\omega_h)d\omega_hdA$$

$dA(\omega_h)$就是指在宏观面积$dA$中，法线位于立体角$d\omega_h$内所有微平面的总面积  

:::

由于实际上不可能去模拟所有微表面的法线方向，而有的是该点处的表面法线方向，整体来说微表面的法线方向都是对宏观法线方向的一个扰动后的结果，也就是说微观的法线都是在宏观法线上稍微摆动了一下，如下图

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781890931291-5bbbd061-3e67-4fec-9caa-a16b8ac5261c.png)

**NDF不是概率密度函数，也不是正态分布函数，而是一个面积的密度函数，这需要纠正的一点。** 因为微平面的法线存在无数个，因此法线分布函数不能使用一个具体的向量值，而需要使用微分立体角限定一个范围。这样才可以宏观统计分布。

:::info
**归一化约束：**

宏观表面中的所有微观表面的投影面积应当等于宏观表面的面积。

在上文中，我们有对$dA$进行一个简单的推导，得到了$dA(\omega_h)=D(\omega_h)d\omega_hdA$，这个式子的含义是$dA$上法线位于立体角$\omega_h$内所有微表面的总面积，因此NDF的本质是一个密度函数。我们考虑对上式在上半球进行积分，其实就是把$h$的方向在上半球的每一个方向都计算一次相应的微表面面积，然后再累加起来。每个微表面的法线都是固定，在整个半球上积分也就是每个微表面都能够计算到。所以我们用$dA_h$表示宏观表面内所有微表面的面积，用$\Omega$表示上半球范围于是有：

$$dA_h=\int_\Omega D(\omega_h)d\omega_hdA$$

然后我们再对其求一个投影，其结果应该等于宏观表面的面积，也就是$dA$：

$$dA=\int_\Omega D(\omega_h)d\omega_hdAcos\theta_h=\int_\Omega D(\omega_h)d\omega_hdA(n·\omega_h)$$

由于$dA$是宏观着色区域面积，不随着积分变化，所以可以作为常量将$dA$提取出来，之后可以两边消去$dA$得：

$$\int_\Omega D(\omega_h)(n·\omega_h)d\omega_h=1$$

即将$D(\omega_h)$投影到宏观表面上，会得到宏观表面的面积，其被约束等于1

换句话说，$D(\omega_h)(n·\omega_h)$是被归一化的。

归一化意味着着色模型根据其角度大小按比例缩放镜面高光的强度，这样总反射能量在不同的表面平滑度下保持不变。总的来说也是为了保持PBR的能量守恒原则的。即 **“入射多少能量，只要不考虑吸收，反射总能量在宏观上就是守恒的”。**  

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059642647-01fbff63-ba6b-4a75-8e3f-f776dc9f00fa.png)

更一般的，微表面与宏观表面在投影到垂直于任何视角观察方向$v$的平面上的面积也是相等的：

$$\int_\Omega D(\omega_h)(v·\omega_h)d\omega_h=v·n$$

方程左边指的是微表面在垂直于视角方向的平面上的投影，右边指的是宏观表面在垂直于视角方向的平面上的投影。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059635849-f6078602-08e6-4402-a46b-85e1848c6a8a.png)

需要注意的是在这里点乘$(v·m)$，不能够限制为大于或等于零。因为涉及到正负抵消，在上图可看到很多重叠的微表面，对最终效果有所影响的还是可见微表面，即在每个重叠集合中最接近相机的微平面。这一事实表明了将投影的微观区域与投影的宏观几何区域相关联的另一种方法：可见微平面的投影面积之和等于宏观表面的投影面积。

也就是说我们只需要计算可见微表面即可。我们可以通过定义**遮蔽函数(masking function)**$G_1(\omega_h,v)$来对其进行数学表达($G_1$是$G$几何函数的基础，只考虑视角方向的遮挡)，给出了沿着视角方向可见具有法线$\omega_h$的微表面的比率。

$$\int_\Omega G_1(\omega_h,v)D(\omega_h)(v·\omega_h)^+d\omega_h=v·n$$

注意这里是加上了+号的限制，也就是现在必须是大于零的，也就是说背面的微表面不予考虑。乘积$G_1(\omega_h,v)D(\omega_h)$则表示了可见法线的分布，如下图：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059742913-86280a1b-8400-4db2-bdc9-015d69fe2c75.png)

:::

那么在这里可以对法线分布函数做一个**性质**的总结，如下所示：

1. 微表面法线密度始终为非负值：$0≤D(\omega_h)≤\infty$
2. 微表面的总面积始终不小于宏观表面总面积：$\int_\Omega D(\omega_h)d\omega_h≥1$
3. 任何方向微表面的投影面积和宏观表面一致：$\int_\Omega D(\omega_h)(v·\omega_h)d\omega_h=v·n$
4. 若观察方向为法线方向，则其积分可以归一化。即$v=n$时，$\int_\Omega D(\omega_h)(n·\omega_h)d\omega_h=1$



---

历史上主流的法线分布函数，按提出时间进行排序，可以总结为：

+ Berry [1923]
+ Beckmann [1963]
+ Phong [1973]
+ Blinn-Phong [1977]
+ ABC [1989]
+ GGX [2007] / Trowbridge-Reitz [1975]
+ Shifted Gamma Distribution，SGD [2012]
+ Trowbridge-Reitz（GTR）[2012]
+ Student’s T-Distribution , STD [2017]
+ Exponential Power Distribution , EPD [2017]



#### 各向同性（Isotropic）NDF
:::info
这里略微补充一下各向同性和各向异性的区别

简单来说就是，各向同性的BRDF在输入和输出方向围绕表面法线变化(都与法线的夹角保持不变)时保持不变；

而各项异性的话会跟着和表面法线夹角会有所改变，通常各项异性应用在头发、丝绸、磁盘的材质会比较多。

也就是说各向同性会在入射光线和出射光线的方向变化的时候，保持与法线的夹角不变，并且对应的BRDF的值也是不变的，而各向异性则会有不同的BRDF的值。

说人话就是，如下图，各向同性中BRDF不会随着$\phi$而变化，只受$\theta$的影响；而各向异性中，BRDF受$\phi$和$\theta$同时影响。

:::

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225252922-f339dcf7-9d35-41c9-b53d-c8c89af7e17b.png)



---



##### Blinn-Phong 分布
了解了NDF所需要的性质之后，问题是需要NDF满足什么？期望对于较光滑宏观表面当$h=n$时也就是半角向量和微表面法线重合，$D(h)$达到最大值。当大部分的$h$都偏向于$n$时，$D(h)$为上涨趋势；当$h$越来越偏离$n$时，$D(h)$值也要相应变小。而且，当宏观表面粗糙度变高时，$D(h)$的值也会变小。此外，随着$h·n$的值变小，衰减的越慢，有一个拖尾的效果最好，更符合想要的效果。

首先构造一个函数出来，首先想到的是$(h·n)^\alpha$，也就是$cos^\alpha\theta_h$，其中$α$是粗糙度系数，该值较大代表比较光滑，较小则代表粗糙表面，根据不同$α$的取值的$D(h)$的表现如下：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782040094845-3bb5a088-fe03-460a-8bc1-e35831d9c5ea.png)

从上图可知，对于同一个$α$值，随着$\theta$值慢慢变大，对应的微表面法线和宏观表面法线重合的微表面越来越少，对应的$D(h)$也缓慢衰减。当$α$的取值越大时，宏观表面越光滑，对应到当$\theta$值变大时的$D(h)$衰减加快。

但是还是不满足之前关于NDF的性质，首先需要一定满足$α$是偶数才可以满足$0≤D(\omega_h)≤\infty$的特性。因为当$\theta$大于90°的时候，$cos\theta$值为负数，此时$α$如果为奇数最终结果仍为负数，这在物理和数学上不允许。

于是我们引入了一种假设——**高度场模型**，所谓高度场的微表面模型就是微表面法线分布在宏观表面法线所在的半球上，即$\theta$限制在$\left[0,\frac{\pi}{2} \right]$，故不存在朝下的微表面法线。满足这条假设约束的微表面模型则不会有$α$的限制。

还记得我们上面的归一化约束吗，$\int_{h\in\Omega} (h·n)^\alpha(n·h)d\omega_h$（等同于$\int_{\Omega} (\omega_h·n)^\alpha(n·\omega_h)d\omega_h$）在非高度场模型中永远等于0，即便是在使用了高度场的模型中，结果也不为1，甚至当$α$取值不同时结果也不同。也就是说不满足**能量守恒**的原则。

因此我们需要一个**归一化因子（normalization factor）**$k$，即$\int_{h\in\Omega} k(h·n)^\alpha(n·h)d\omega_h=1$

接下来就开始推导$k$，首先是将$d\omega_h$转化，依托之前推导可知的$d\omega_h=sin\theta d\theta d\phi$，代入可得：

$$\int^{2\pi}_{0}d\phi_h\int^{\frac{\pi}{2}}_0kcos^\alpha\theta_h cos\theta_h sin\theta_h d\theta_h=1$$

将一些常量提取出来并简化得到：

$$2\pi k\int^{\frac{\pi}{2}}_0cos^{\alpha+1}\theta_h sin\theta_h d\theta_h=1$$

只需要推导$\int^{\frac{\pi}{2}}_0cos^{\alpha+1}\theta_h sin\theta_h d\theta_h$即可，我们直接使用换元法，令$u=cos\theta_h$，则$du=-sin\theta_hd\theta_h$代入积分，同时变换上下限：当$\theta_h=0$时，$u=1$；当$\theta_h=\frac{\pi}{2}$时，$u=0$。于是得到：

$$\int^{0}_{1}u^{\alpha+1}·(-du)=\int^{1}_{0}u^{\alpha+1}du=\left[\frac{u^{\alpha+2}}{\alpha+2}\right]^1_0=\frac{1}{\alpha+2}$$

我们直接代回原式：

$$\frac{2\pi k}{\alpha+2}=1$$

$$k=\frac{\alpha+2}{2\pi k}$$

最后的法线分布函数为：

$$D(h)=\frac{\alpha+2}{2\pi}(h·n)^\alpha$$

这就是 Blinn-Phong 分布，从一开始$h·n$推导到了已经完成归一化的程度，其中$\alpha$是 Blinn-Phong NDF 的“粗糙度参数”，$\alpha$高值表示光滑表面，低值表示粗糙表面。对于非常光滑的曲面值可以任意高(一个完美的镜面$\alpha=\infty$)，并且通过将$\alpha$设置为0可以实现最大随机曲面(均匀NDF)。但是这个参数非常不方便与美术人员的操作，因为带来的视觉变化十分的不均匀。经常让美术家们操纵“界面值”，即通过非线性函数从中导出$\alpha$。例如：$\alpha=ms$，其中$s$是0到1之间的艺术家操纵值，$m$是给定的电影或游戏中$\alpha$的上限(比如上图8196)。当BRDF参数的行为在视觉上上不统一时，这种 "界面映射 "是很常用的方案。

如下图是不同$\alpha$取值的 Blinn-Phong 分布的表现：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782056699315-1a963d1d-5a67-4e5d-9aa6-ed1f865e3a55.png)



在 UE 中，存在着不一样的映射，将$\alpha=2\alpha^{-2}_{p}-2$，得到新的式子：

$$D(h)=\frac{1}{\pi\alpha^2}(h·n)^{\frac{2}{\alpha^2}-2}$$

这里对$\alpha$取了一个倒数映射，带来的最大的好处就是，让粗糙度系数更符合直觉，原来 Blinn-Phong 分布的$\alpha$越大越平滑，明明叫做粗糙度，效果却与名称完全相反，这样的映射修复了这一反直觉的现象。这种映射还可以使得在表现粗糙材质的时候，其高光“拖尾”效果更接近真实的物理测量数据，提升了视觉真实感。

我们看一下它在不同$\alpha$取值的$D(h)$的趋势图：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782056928869-92067e1b-dc26-483f-888e-0c3532e736a7.png)

可以从图中看出，这样

还有一个重要的点，Blinn-Phong是不满足**形状不变性(Shape Invariance)** 的，关乎到后续的几何函数（这个很重要，后面会解释）



---



##### Beckmann 分布 + 斜率空间
**Beckmann NDF**是**光学界(optics community)在第一个微表面模型中使用的法线分布函数。当Cook-Torrance BRDF**初步提出的时候也是选用 Beckmann，现在同样还在使用。Beckmann 归一化之后的法线分布方程如下：

$$\begin{align*}
D(h)&=\frac{1}{\pi\alpha^2(n·h)^4}e^{\left(\frac{(n·h)^2-1}{\alpha^2(n·h)^2} \right)} 
\end{align*}$$

$$D(h)=\frac{1}{\pi\alpha^2cos^4\theta_h}e^{\left(\frac{cos^2\theta_h-1}{\alpha^2cos^2\theta_h} \right)}$$

由于$cos^2\theta-1=-sin^2\theta$，所以这个式子可以进一步化简：

$$\begin{align*}
D(h)&=\frac{1}{\pi\alpha^2cos^4\theta_h}e^{\left(\frac{-sin^2\theta_h}{\alpha^2cos^2\theta_h} \right)} \\
&=\frac{1}{\pi\alpha^2cos^4\theta_h}e^{\left(-\frac{tan^2\theta_h}{\alpha^2} \right)}
\end{align*}$$

如下图是不同$\alpha$取值的 Beckmann 分布的表现：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782058233080-84bff797-4a19-461f-a477-adc5b073521b.png)

Beckmann分布在某些方面与Blinn-Phong分布非常相似。 两种法线分布的参数可以同样使用$\alpha=2\alpha^{-2}_{p}-2$关系式。可从下图看出：

<!-- 这是一张图片，ocr 内容为： -->
![图 Blinn-Phong（蓝色虚线）和 Beckmann（绿色）分布](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059862447-5b7d73de-0a82-456a-a4d2-52c14f8f3ab4.png)

但是Beckmann分布是满足形状不变性的 NDF。

:::info
在做证明之前，我们还需要补充一点知识

**斜率空间**

就是通过使用斜率来表示一个向量（微表面方向）

**二维斜率空间表示**

如下图所示，微表面的斜率为$\frac{x_B-x_A}{y_B-y_A}$，法线$h$的斜率$k_h=\frac{y_h}{x_h}=\frac{1}{tan\theta_h}$，因为法线与微表面垂直，所以它们的斜率乘积为-1，即$\frac{x_B-x_A}{y_B-y_A}·\frac{y_h}{x_h}=-1$。所以可得$\frac{x_B-x_A}{y_B-y_A}=-tan\theta_h=-\frac{x_h}{y_h}$

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225232950-f735ca67-c1e3-4e69-b440-2a3da0712599.png)

**三维斜率空间表示**

在三维空间中，如果法线$h$的斜率依旧用$\frac{1}{tan\theta_h}$表示的话，会存在一个问题z：无法用斜率来确定一个唯一的法线。例如将微表面绕$z$轴稍微旋转一点，此时法线$h$发生了变化，但是其斜率依旧没变。所以如下图，我们设法线$h$为$(\Delta h_x,\Delta h_y,\Delta h_z)$，在这里将法线分别投影到$xz$和$yz$平面上，得到$OA$、$OB$。

<!-- 这是一张图片，ocr 内容为： -->
![红色区域是微表面，z轴是宏观表面法线方向](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225201546-34b7f030-a646-4483-b551-2dd0d6c8c5c2.png)



还是和之前一样的推导公式，$OA$的斜率$\frac{\Delta h_z}{\Delta h_x}=\frac{1}{tan\theta_hcos\phi_h}$，$OB$的斜率$\frac{\Delta h_z}{\Delta h_y}=\frac{1}{tan\theta_h sin\phi_h}$

设微表面和$xz$平面的相交线为$L$，即图中微表面上的红色虚线。因为微表面平面方程（经过原点）为：

$$\Delta h_xx+\Delta h_yy+\Delta h_zz=0$$

又因为$xz$平面方程为$y=0$，代入可以求得交线$L$满足的方程：

$$\Delta h_xx+\Delta h_zz=0$$

可以求得其斜率为$\frac{\Delta z}{\Delta x}=-\frac{\Delta h_x}{\Delta h_z}=-tan\theta_hcos\phi_h$

同理，可以求得，$yz$平面与微表面的相交线的斜率为$\frac{\Delta z}{\Delta y}=-\frac{\Delta h_y}{\Delta h_z}=-tan\theta_hsin\phi_h$

三维空间中的法线可以通过它所在的微表面与$xz$与$yz$平面的相交线的斜率组合成的向量来定义，即：

$$(-tan\theta_hcos\phi_h,-tan\theta_hsin\phi_h)$$

由于斜率和法线之间的关系，斜率可以作为法线的另一种参数化，在$z>0$的半球，即满足高度场模型下，给定任何向量，可以将其视为法线并找到垂直于它的表面的斜率。**<u>斜率空间</u>** 就是所有可能的斜率值的二维空间。由于斜率可以是任何实数，所以斜率空间只是实数平面。

将斜率空间可视化的一个好方法是将其与平面$z=1$，即半球顶部相联系。 然后在原点的向量可以通过与平面相交来转换为斜率空间。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782108377967-f49b748e-275a-4de8-ba12-c788e06d12b4.png)

这里引入了一个符号$\tilde{n}$表示斜率空间中与三维向量$n$（也就是$h$）相对应的二维向量。

想象在三维空间的原点$(0, 0,0)$放一个灯泡，在高度$z=1$的位置放一张无限大的透明玻璃板（即平面$z=1$）。  
现在，空间中任意一条朝上的法线向量$v$，比如$(v_x,v_y,v_z)$，就像一束光。我们沿着它的$z$方向把它“拉长”，直到它击中那张玻璃板。因为玻璃板的高度是 1，所以击中点的$z$坐标必须是 1；了把原来的向量$v$拉到$z=1$的高度，我们需要把整个向量除以它自己的$v_z$（即缩放倍数$\frac{1}{v_z}$），那么击中点的坐标为：$(\frac{v_x}{v_z},\frac{v_y}{v_z},1)$。这里的可以看作为调整向量取负后的$x$、$y$分量，可以将斜面想象为倒置的$x$、$y$轴来解决这个问题，也就是对$x$、$y$取反方向。

因此可以通过将每个点投影到远离原点直到它碰到平面来想象半球被放大并拉伸到平面上。这在单位向量之间建立了双射(一对一映射，$z>0$，并且点在平面上)

正式地说，任意向量的斜率空间参数化$v$与$v_z>0$的情况下可定义为：

$$\tilde{v}_x=-\frac{v_x}{v_z}$$

$$\tilde{v}_y=-\frac{v_y}{v_z}$$

这假设向量是向上的，因此必须满足$v_z>0$。它们不能区分向上和向下的向量，因为斜率没有方向概念，反转法线仍然得到相同的斜率。

从斜率转换回单位法向量也很简单，把拉伸后的向量进行一个归一化即可，公式如下：

$$v=normalize(-\tilde{v}_x,\tilde{v}_y,1)$$

单位向量的另一个常见参数化是极坐标$(\theta,\phi)$。计算出斜率和极坐标之间的转换是很简单的，我们定义极坐标，使得$\theta$从$+z$轴向下测量，$\phi$从$+x$轴逆时针测量，就是我们上面那张三维空间的图一样的定义。

极坐标和$3D$单位向量之间的转换：

$\theta=acos(z)$ 
$\phi=atan2(y,x)$

$x=sin\theta cos\phi$
$y=sin\theta sin\phi$
$z=cos\theta$

极坐标空间和斜率空间的转换如下：

$\theta=atan(\sqrt{\tilde{x}^2+\tilde{y}^2})$
$\phi=atan2(-\tilde{y},-\tilde{x})$ 
$\tilde{x}=-tan\theta cos\phi$
$\tilde{y}=-tan\theta sin\phi$

**为什么需要斜率空间**

现在已经了解了如何定义斜率空间并从中来回转换。但是为什么有用呢？为什么我们要以这种方式表示向量或函数？

 在微表面BRDF理论中，为简单起见通常假设微表面是一个高度场(对于许多日常材料来说，这是一个非常合理的假设)。如果微表面是一个高度场，那么它的法线被限制在上半球。斜率空间非常适合精确参数化上半球。

 从性能的角度来看，斜率空间的转换成本也比极坐标低得多，这使得它更适合在着色器中使用。它只需要一些除法或归一化，而不是一堆正三角函数或反三角函数。 

与单位向量的其他表示相比，斜率空间也没有边界。斜面的原点(0, 0)表示平面法线，越远斜率越极端，但不能使平面倒置或产生无效法线。因此可以在斜率空间中自由地对向量进行各种操作，而不必担心超出任何界限。

关于斜率空间的另一个有用的事实是，表面的许多线性变换如缩放或剪切都可以简单地映射到斜率空间的变换。例如将一个表面沿其$z$轴按因子$\alpha$缩放表面会导致其法向量的$z$分量按$\frac{1}{\alpha}$缩放（由于法线采用逆转置），但由于$n_z$在斜率空间的定义中是分母，所以我们可以得出表面的斜率按$\alpha$缩放。

例如：二维表面中，当表面在$x$轴方向上发生拉伸$\lambda$倍。法线变化为$normalize(\frac{x_h}{\lambda},y_h)$，法线的斜率变化为$k_h=\lambda\frac{y_h}{x_h}=\lambda\frac{1}{tan\theta_h}$，则微表面斜率变为$\tilde{h}^\prime=\frac{1}{\lambda}\tilde{h}$

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225175787-ae3f106a-e2e6-45fe-818a-91163a62c694.png)



**斜率空间在NDF中的应用**

微表面 BRDF 的关键要素之一是它的法线分布函数（NDF），而斜率空间的关键用途之一正是定义NDF。由于斜率空间是一个无界的二维平面，我们可以像在任意二维域中那样，引入现成的一维或二维分布函数，并以各种方式操作它们。只要我们最终在斜率平面上得到一个有效的、归一化的概率分布（有时称为斜率分布函数，或$P^{22}$函数），我们就能将其转换为以极坐标或向量形式表达的、具有正确归一化的NDF。

通俗来说就是**半球面（NDF定义域）是扭曲的、有边界的**，而**斜率空间是平坦的、无界的二维平面**。在平面上定义分布、做采样、做滤波，都比在球面上容易得多。但问题来了：平面上的分布不能直接拿来就用，必须经过一个**严密的数学转换**，才能变成物理正确的NDF。

**雅可比行列式（The Jacobian）**

在将分布函数从一个空间映射到另一个空间时，重要的是要记住，这些函数的值并非无量纲的数字；它们是相对于底层空间的面积或体积测度的密度。因此，仅仅通过改变变量来用新坐标表达函数是不够的；你还必须校正映射对体积的拉伸或挤压，这种拉伸或挤压可能随位置变化而变化。

假设我们有域$A$上的概率密度$p(a)$，映射到域$B$上的密度$p(b)$，必须保证概率总量守恒：

$$p(a)dA=p(b)dB$$

这表示在无穷小体积$dA$中的概率量，映射后仍然等于$dA$中的概率量。

这个等式可以改写为：

$$p(b)=p(a)\frac{dA}{dB}$$

这里的因子$\frac{dA}{dB}$称为**雅可比行列式**，指的是包含变量从$a$到$b$变化的所有导数的**雅可比矩阵** 的行列式。 实际上，这是**逆雅可比行列式**，因为$A →B$的**正雅可比行列式**是$\frac{dB}{dA}$。

**什么是“逆雅可比”？** 如果映射$A →B$把局部面积拉伸了 2 倍（即$\frac{dB}{dA}=2$），那么为了让密度乘以新面积后总量不变，新的密度必须变成原来的一半，即乘以$\frac{dA}{dB}=\frac{1}{2}$。这个$\frac{dA}{dB}$就是逆雅可比行列式。我们后面要算的，就是这个$\frac{dA}{dB}$的精确数值

因此，当将斜率空间分布转换为 NDF 时，我们必须乘以适当的雅可比行列式。 但是我们如何找出那是什么？ 首先，我们必须记住，NDF 的定义不是**半球立体角上的密度**，而是**平面上投影面积上的密度**。 因此，仅仅找到从**斜率空间到极坐标的雅可比行列式** 是不够的； 我们还需要找到从**极坐标到投影面积的雅可比行列式**。



最简单的方法是使用微分形式的 Formalism (形式理论)

这里我们还需要引入一种新的运算——**楔积**（又称外积，符号：$\wedge$）

[有向面积、叉乘以及楔积介绍](https://www.bilibili.com/video/BV1bV411r7AJ/)


总之记住楔积是用来求面积的，并且有三个重要性质：

结合律：$(a \overrightarrow{u}+b \overrightarrow{v}) \wedge \overrightarrow{w}
=a \overrightarrow{u} \wedge \overrightarrow{w}+b \overrightarrow{v}\wedge \overrightarrow{w}$

反交换：$\overrightarrow{u} \wedge\overrightarrow{v}=-\overrightarrow{v} \wedge \overrightarrow{u}$    

反交换的延申：$\overrightarrow{u} \wedge\overrightarrow{u}=-\overrightarrow{u} \wedge \overrightarrow{u}=0$



第一步，计算极坐标下的法线方向$(\theta,\phi)$对应的微表面，投影在水平面（$xy$平面）上的真实面积是多少：

前面我们知道，极坐标转$3D$单位向量的公式是：$x=sin\theta cos\phi$ $y=sin\theta sin\phi$

我们先求全微分$dx$和$dy$：

$$dx=\frac{\partial x}{\partial \theta}d\theta+\frac{\partial x}{\partial \phi}d\phi=cos\theta cos\phi d\theta-sin\theta sin\phi d\phi$$

$$dy=\frac{\partial y}{\partial \theta}d\theta+\frac{\partial y}{\partial \phi}d\phi=cos\theta sin\phi d\theta+sin\theta cos\phi d\phi$$

然后再做楔积$\wedge$求面积（把变化量组合成有方向的面积）：

$$\begin{align*}
dB=dx\wedge dy&=(cos\theta cos\phi d\theta-sin\theta sin\phi d\phi)\wedge(cos\theta sin\phi d\theta+sin\theta cos\phi d\phi) \\
&=0+sin\theta cos\theta cos^2\phi(d\theta \wedge d\phi) - sin\theta cos\theta sin^2\phi(d\phi\wedge d\theta ) -0 \\
&=sin\theta cos\theta cos^2\phi(d\theta \wedge d\phi) + sin\theta cos\theta sin^2\phi(d\theta\wedge d\phi) \\
&=sin\theta cos\theta(d\theta \wedge d\phi)(cos^2\phi+sin^2\phi) \\
&=sin\theta cos\theta(d\theta \wedge d\phi)
\end{align*}$$

第二步，计算极坐标下的法线方向$(\theta,\phi)$对应的微表面，投影在**斜率空间**上占多少面积：

前面我们知道，极坐标转斜率空间的公式是：$\tilde{x}=-tan\theta cos\phi$$\tilde{y}=-tan\theta sin\phi$

我们先求全微分$d\tilde{x}$和$d\tilde{y}$：

$$d\tilde{x}=\frac{\partial \tilde{x}}{\partial \theta}d\theta+\frac{\partial \tilde{x}}{\partial \phi}d\phi=-cos^{-2}\theta cos\phi d\theta+tan\theta sin\phi d\phi$$

$$d\tilde{y}=\frac{\partial \tilde{y}}{\partial \theta}d\theta+\frac{\partial \tilde{y}}{\partial \phi}d\phi=-cos^{-2}\theta sin\phi d\theta-tan\theta cos\phi d\phi$$

然后再做楔积$\wedge$求面积（把变化量组合成有方向的面积）：

$$\begin{align*}
dA=d\tilde{x} \wedge d\tilde{y}&=(-cos^{-2}\theta cos\phi d\theta+tan\theta sin\phi d\phi) \wedge (-cos^{-2}\theta sin\phi d\theta-tan\theta cos\phi d\phi)\\
&=cos^{-2}\theta tan\theta cos^2\phi (d\theta \wedge d\phi)-cos^{-2}\theta tan\theta sin^2\phi(d\phi\wedge d\theta)\\
&=cos^{-2}\theta tan\theta cos^2\phi (d\theta \wedge d\phi)+cos^{-2}\theta tan\theta sin^2\phi(d\theta\wedge d\phi)\\
&=cos^{-2}\theta tan\theta(d\theta\wedge d\phi)
\end{align*}$$

第三步，求将密度从斜率空间转换到 NDF 形式的逆雅可比行列式$\frac{dA}{dB}$：

$$\begin{align*}
\frac{dA}{dB}=\frac{d\tilde{x} \wedge d\tilde{y}}{dx\wedge dy}&=\frac{cos^{-2}\theta tan\theta(d\theta\wedge d\phi)}{sin\theta cos\theta(d\theta \wedge d\phi)}\\
&=\frac{1}{cos^4\theta}
\end{align*}$$

最后我们就可以用这个雅可比行列式去得到法线分布函数和斜率分布函数的关系：

$$D(h)=\frac{P^{22}(\tilde{x},\tilde{y})}{cos^4\theta}$$

如果同时考虑到粗糙度$\alpha$的话，那么对于各项同性的 BRDF 而言，法线分布函数和斜率分布函数分别为$D(h,\alpha)$和$P^{22}(\tilde{x},\tilde{y},\alpha)$

:::

**Beckmann 分布的推导：**

既然我们学习了斜率空间，就从斜率空间开始思考。前面我们学了，在斜率空间可以用一组二维向量$(\tilde{x},\tilde{y})$来表示一个微表面中的法线。我们期望当$\tilde{x}=0$和$\tilde{y}=0$的时候，也就是微表面法线与宏观法线重合的时候，$D(h)$达到最大值。当大部分的$\tilde{x}$和$\tilde{y}$偏向于 0 时，$D(h)$为上涨趋势；当的$\tilde{x}$和$\tilde{y}$越来越偏离 0 时，$D(h)$的值也要相应变小。而且当宏观表面粗糙度变高时，$D(h)$的值也要相应变小。此外，随着$\tilde{x}$和$\tilde{y}$的值越来越偏离 0，衰减的越慢。

那么满足这样的函数，我们大概第一个想到的就是 **“二维高斯分布”** （二维正态分布）。没错，Beckmann 分布就是基于**二维高斯分布** 推导的。我们先来看看二维高斯分布的完整公式：

$$f(x,y)=\left(2\pi σ_xσ_y \sqrt{1-\rho^2} \right)^{-1}e^{\left[\frac{-1}{2(1-\rho^2)} \left(\frac{(x-\mu_1)^2}{σ^2_x}-\frac{2\rho(x-\mu_1)(y-\mu_2)}{σ_xσ_y}+\frac{(y-\mu_2)^2}{σ^2_y} \right) \right]}$$

这个公式看起来很可怕吧，是的，这很可怕。不过我们稍微分析一下，就能化简成很简单的公式。

其中$\mu_1$和$\mu_2$是这个二维高斯分布的中心点的$xy$坐标，也就是说，这个二维高斯分布的中心点也就是最大值所在地为$(\mu_1,\mu_2)$，在斜率空间中，我们宏观法线所在位置是$(0,0)$，所以$\mu_1=\mu_2=0$。

而$σ_x$和$σ_y$是控制分布沿着$x$轴和$y$轴方向的散开程度，$σ$越大，曲线越胖，数据越分散，表面越粗糙。这个就是我们的粗糙度系数，由于我们这是各向同性，所以$σ_x=σ_y=\alpha$。

最后一个$\rho$值是$x$与$y$的相关系数，取值在$[-1,1]$，由于这里是各向同性，$x$与$y$相互独立，无线性相关性，所以$\rho=0$。

这里我们的$x$与$y$，也要换成斜率空间中的$\tilde{x}$与$\tilde{y}$

我们把这些值代入，可得：

$$f(\tilde{x},\tilde{y})=\frac{1}{2\pi\alpha^2}e^{\left(-\frac{\tilde{x}^2+\tilde{y}^2}{2\alpha^2} \right)}$$

我们进一步对方程做优化。我们把与可调节的系数，即粗糙度系数$\alpha$，有关不变系数优化掉，也就是用$\alpha^2$替换掉原来的$2\alpha^2$。顺便换成$P^{22}$来表示斜率分布函数得：

$$P^{22}(\tilde{x},\tilde{y})=\frac{1}{\pi\alpha^2}e^{\left(-\frac{\tilde{x}^2+\tilde{y}^2}{\alpha^2} \right)}$$

现在我们的方程就与一开始的庞然巨物相比简单了很多。

前面我们学习到，在斜率空间中，$\tilde{x}=-tan\theta_hcos\phi_h$，$\tilde{y}=-tan\theta_hsin\phi_h$，代入到公式中：

$$\begin{align*}
P^{22}(\tilde{x},\tilde{y})&=\frac{1}{\pi\alpha^2}e^{\left(-\frac{\tilde{x}^2+\tilde{y}^2}{\alpha^2} \right)}\\
&=\frac{1}{\pi\alpha^2}e^{\left(\frac{-tan^2\theta_h(cos^2\theta_h+sin^2\theta_h)}{\alpha^2} \right)}\\
&=\frac{1}{\pi\alpha^2}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)}
\end{align*}$$

我们现在所求的是在斜率空间下的分布函数，我们需要将其转换到$3D$向量空间，也就是将斜率分布函数转换为法线分布函数，使用之前求得的逆雅可比行列式$\frac{dA}{dB}=\frac{1}{cos^4\theta}$：

$$\begin{align*}
D(h)&=P^{22}(\tilde{x},\tilde{y})\frac{dA}{dB} \\
&=\frac{1}{\pi\alpha^2cos^4\theta_h}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)}
\end{align*}$$

这就是 Beckmann 分布函数的推导，不过推导到现在还不要着急结束，我们还需要证明其是否满足归一化约束。先回顾一下会用的结论，归一化约束$\int_\Omega D(h)(n·h)d\omega_h=1$，立体角转化$d\omega=sin\theta d\theta d\phi$。

$$\begin{align*}
\int_\Omega D(h)(n·h)d\omega_h&=\int_\Omega \frac{1}{\pi\alpha^2cos^4\theta_h}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)}cos\theta_h d\omega_h\\
&=\int^{2\pi}_0 d\phi_h \int^{\frac{\pi}{2}}_0 \frac{sin\theta_h}{\pi\alpha^2cos^3\theta_h}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)} d\theta_h\\
&=2\pi·\frac{1}{\pi \alpha^2}\int^{\frac{\pi}{2}}_0 \frac{sin\theta_h}{cos^3\theta_h}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)} d\theta_h\\
&=\frac{2}{\alpha^2}\int^{\frac{\pi}{2}}_0 \frac{sin\theta_h}{cos^3\theta_h}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)} d\theta_h
\end{align*}$$

使用换元法进行求不定积分：

令$u=tan^2\theta_h$，则$du=2tan\theta_hsec^2\theta_hd\theta_h=2·\frac{sin\theta_h}{cos\theta_h}·\frac{1}{cos^2\theta_h}=\frac{2sin\theta_h}{cos^3\theta_h}$，所以$\frac{sin\theta_h}{cos^3\theta_h}=\frac{1}{2}du$。

同时还要修改积分域，当$\theta_h=0$时，$u=0$，当$\theta_h=\frac{\pi}{2}$时，$u→+\infty$

代回原积分得：

$$\int^{+\infty}_0 \frac{1}{2}e^{\left(\frac{-u}{\alpha^2} \right)} du=\frac{1}{2}\int^{+\infty}_0 e^{\left(\frac{-u}{\alpha^2} \right)} du=\frac{1}{2}\left[-\alpha^2e^{\left(\frac{-u}{\alpha^2} \right)}\right]^{+\infty}_0=\frac{\alpha^2}{2}$$

代回原式得：

$$\int_\Omega D(h)(n·h)d\omega_h=\frac{2}{\alpha^2}·\frac{\alpha^2}{2}=1$$

结果为1，满足归一化约束，到此为止，Beckmann 分布函数的推导结束了。



---



##### GGX 分布
上述的 Blinn-Phong 分布以及 Beckmann 分布都可以发现一个问题，就是衰减的特别快，只要图像稍微向两侧走，就会快速降为0。反应到光和物体上就是会有一些锐利的高光，一旦$h$和$n$开始偏移，高光区域瞬间衰减。并没有慢慢衰减的一个过程，这并不符合现实世界的各种材质，所以需要一个更具有“长尾”的法线分布函数，那就是GGX。

GGX即Trowbridge-Reitz分布，最初由Trowbridge和Reitz推导出，在Blinn 1977年的论文中也有推荐此分布函数，但一直没有受到图形学界的太多关注。30多年后，Trowbridge-Reitz分布被Walter等人独立重新发现，并将其命名为GGX分布。

GGX 归一化之后的法线分布方程如下：

$$D(h)=\frac{\alpha^2}{\pi((h·n)^2(\alpha^2-1)+1)^2}$$

$$D(\theta_h)=\frac{\alpha^2}{\pi(cos^2\theta_h(\alpha^2-1)+1)^2}=\frac{\alpha^2}{\pi(cos^2\theta_h \alpha^2+sin^2\theta_h)^2}$$

我们可以对这个式子进一步变形：

$$\begin{align*}
D(\theta_h)&=\frac{\alpha^2}{\pi(cos^2\theta_h a^2+sin^2\theta_h)^2}\\
&=\frac{\alpha^2}{\pi(cos^4\theta_h \alpha^4+2cos^2\theta_hsin^2\theta_h\alpha^2+sin^4\theta_h)}\\
&=\frac{\alpha^2}{\pi cos^4\theta_h(\alpha^4+2tan^2\theta_h\alpha^2+tan^4\theta_h)}\\
&=\frac{\alpha^2}{\pi cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}
\end{align*}$$

分母的这个$cos^4\theta_h$是不是很眼熟，这个不就是我们之前推导的斜率分布函数与法线分布函数之间的关系中包含的因子吗，是的，GGX 也是在斜率空间的基础上推导出来的。

**推导：**

这次我们需要找到一个比 Blinn-Phong 分布和 Beckmann 分布高光衰减更慢的函数，即**在斜率空间找一个“中间隆起、两端缓慢衰减”的简单有理函数**。

而有这么一个函数刚好满足这个条件，它就是$\frac{1}{(r^2+\alpha^2)^2}$。

其中$r$是变量，在这里可以视为斜率空间中微表面的法线斜率$\sqrt{\tilde{x}^2+\tilde{y}^2}=tan\theta_h$，$\alpha$是粗糙度系数。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782151947599-1fc589f6-6822-4e30-9001-8b66b6a08ad8.png)

在图中可以看出，两边的衰减没有那么剧烈了。既然找到了合适的函数，那么下一步就是要对它进行归一化约束。

设归一化系数为$k$，则$P^{22}(\tilde{x},\tilde{y})=\frac{k}{(\alpha^2+tan^2\theta_h)^2}$，然后我们先把它转换为法线分布函数：

$$D(h)=P^{22}(\tilde{x},\tilde{y})·\frac{1}{cos^4\theta_h}=\frac{k}{cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}$$

由于归一化约束，所以需要满足：

$$\int_\Omega D(h) (n·h)d\omega_h=\int_\Omega \frac{k}{cos^4\theta_h(\alpha^2+tan^2\theta_h)^2} cos\theta_hd\omega_h=1$$

因为$d\omega=sin\theta d\theta d\phi$，所以

$$\begin{align*}
\int_\Omega D(h) (n·h)d\omega_h&=\int_\Omega \frac{k}{cos^4\theta_h(\alpha^2+tan^2\theta_h)^2} cos\theta_hd\omega_h\\
&=\int^{2\pi}_0 d\phi_h \int^{\frac{\pi}{2}}_0 \frac{sin\theta_hk}{cos^3\theta_h(\alpha^2+tan^2\theta_h)^2} d\theta_h\\
&=2\pi k \int^{\frac{\pi}{2}}_0 \frac{tan\theta_h}{cos^2\theta_h(\alpha^2+tan^2\theta_h)^2} d\theta_h
\end{align*}$$

使用换元法进行求解：

令$u=tan\theta_h$，$du=sec^2\theta_hd\theta_h=\frac{1}{cos^2\theta_h}d\theta_h$，所以$d\theta=cos^2\theta_hdu$

同时还有更改积分域，当$\theta=0$时，$u=0$，当$\theta=\frac{\pi}{2}$，$u → +\infty$，代入原积分得：

$$\int^{+\infty}_0 \frac{u}{(\alpha^2+u^2)^2}du$$

继续换元化简，令$t=a^2+u^2$，则$dt=2udu$，所以$udu=\frac{1}{2}dt$，

更改积分域，当$u=0$时，$t=a^2$，当$u→+\infty$时，$t→+\infty$，得：

$$\frac{1}{2}\int^{+\infty}_{\alpha^2} \frac{1}{t^2}dt=\frac{1}{2}\left[-\frac{1}{t}\right]^{+\infty}_{\alpha^2}=\frac{1}{2}(0+\frac{1}{\alpha^2})=\frac{1}{2\alpha^2}$$

代回原式得：

$$\begin{align*}
\int_\Omega D(h) (n·h)d\omega_h=2\pi k \int^{\frac{\pi}{2}}_0 \frac{tan\theta_h}{cos^2\theta_h(\alpha^2+tan^2\theta_h)^2} d\theta_h&=1\\
\frac{2\pi k}{2\alpha^2}&=1\\
k&=\frac{\alpha^2}{\pi}
\end{align*}$$

求得归一化系数为$k=\frac{\alpha^2}{\pi}$，代入到最初的式子中，我们的推导就结束了：

$$D(h)=\frac{k}{cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}=\frac{\alpha^2}{\pi cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}$$



下图展示了GGX在不同$\alpha$值的表现，当偏移越大时并没有快速的衰减到0，而是平稳到了某个数值，能够得到更好的效果。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059227041-580a044e-8891-4de4-9eed-43944f1cc2e3.png)

下图是一张 Beckmann 分布以及 Blinn-Phong 分布和 GGX 分布的对比，在这可以看出 GGX 的高光部位并没有一个快速衰减，而是呈现一个带有光晕的现象。这也就是 GGX 分布的拖尾效果。更加符合现实世界中的材质表现，这也是为什么 GGX 分布能够成为最流行模型之后的原因之一。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225110719-acfba345-bd27-4c0a-a4c8-9573508afcdb.png)

<!-- 这是一张图片，ocr 内容为： -->
![各种NDF高光对比，左下角的是Beckmann分布](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782059938465-ec90eaea-3e99-4237-849e-799d08a0653c.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1783081399857-77492971-afd0-4bdd-8686-b1b32e218c8e.png)

并且GGX分布还有形状不变性的特性，与后面介绍的GTR分布却没有这个特性，这也是导致GTR没有推广开来的原因之一。

:::info
在迪士尼原理着色模型中，GGX 分布同样有一个类似上面 Blinn-Phong 分布以及 Beckmann 分布的映射关系以便用户来使用。Burley推荐将粗糙度$roughness$控制以$\alpha=roughness^2$暴露给用户，其中$roughness$是0到1之间的用户界面粗糙度参数值，以让分布以更线性的方式变化。这种方式实用性较好，不少使用 GGX 分布的引擎与游戏都采用了这种映射，如 UE 和 Unity。

:::



**GGX 分布的移动端性能优化**

我们可以通过使用半精度浮点数(half precision floats)来对此实现进行改进。这种优化需要改变原始方程，因为在半浮点数half（即mediump）中计算$1-(n\cdot h)^2$时存在两个问题：

问题一：当$1-(n\cdot h)^2$接近1时（即高亮部分），$(n\cdot h)^2$的计算会出现浮点数取消（floating point cancellation）现象

问题二：$n\cdot h$在1.0左右没有足够的精度。

可以通过拉格朗日恒等式（Lagrange's identity）解决此问题，格朗日恒等式即：

$$|a×b|^2=|a|^2|b|^2-(a \cdot b)^2$$

由于$n$和$h$都是单位向量，所以$|n×h|^2=1-(n \cdot h)^2$

于是，我们可以通过使用简单的叉积$|n×h|^2$来直接计算半精度浮点数下的$1-(n\cdot h)^2$。

总的来说，此优化方案会带来更好的性能，并保持所有计算都在half（mediump）内进行。

---



##### GTR 分布 + 形状不变性
那能不能有更好的拖尾效果的NDF呢？能够更好的去控制NDF的形状尤其是它的尾部，Burley 根据对 Berry，GGX 等分布的观察，提出了广义的 Trowbridge-Reitz(Generalized-Trowbridge-Reitz，GTR)法线分布函数，提供了更多的对于尾部的控制。公式如下：

$$D(h)=\frac{c}{((h·n)^2(\alpha^2-1)+1)^γ}$$

其中，$γ$参数用于控制尾部形状，而$c$是归一化常数，是一个包含了$γ$和$\alpha$的复杂表达式$c=\frac{(γ-1)(\alpha^2-1)}{\pi(1-\alpha^{2(1-γ)})}$，随着$γ$的变化而变化。当$γ=2$时，$c=\frac{\alpha^2}{\pi}$，GTR 等同于 GGX。随着$γ$的值减小，分布的尾部变得更长，相反则更短。以下为各种值的 GTR 分布曲线与$\theta_h$的关系图示：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782225031149-e70f8dbb-2cba-4f18-8a6a-3b41669877b0.png)

不过从这个公式当中可以看出和GGX的主要差距就是在分母的指数上，总体上肯定希望让红线往绿线和蓝线方向偏移，因为长尾效果更好。注意上边当我们的变得很大的时候，其实是接近于之前的Beckman效果的，所以GTR在GGX和Beckmann实现了某种统一。因此通过修改分母的次数就可以得到相应的不同程度的拖尾效果。虽然GTR在拖尾效果上很好，但是为什么还是推广不开呢？虽然实现了可以随意修改参数得到不同的长尾效果，但是也同时**丧失了形状不变性**，导致其发布以来，无法被广泛使用。

:::info
**形状不变性**

从之前得到过的斜率分布函数可以看出$P^{22}$只和$\tilde{x}$、$\tilde{y}$、$\alpha$这三个变量有关系，那么也就是说如果当斜率分布函数仅与$\frac{tan\theta_h}{\alpha}$参数有关时($\sqrt{\tilde{x}^2+\tilde{y}^2}=tan\theta_h$)，微表面模型拥有形状不变性，即**改变粗糙度**$\alpha$**值等效于拉伸微表面，并不改变微表面的形状**。此时斜率分布函数可以写作：

$$P^{22}\left(x_{\tilde{h}},y_{\tilde{h}},\alpha\right) = \frac{1}{\alpha^2} f\left( \frac{\sqrt{x_{\tilde{h}}^2 + y_{\tilde{h}}^2}}{\alpha} \right) \implies P^{22}\left( \frac{\tan\theta_h}{\alpha} \right) = \frac{1}{\alpha^2} f\left( \frac{\tan\theta_h}{\alpha} \right)$$

其中$\frac{1}{\alpha^2}$是这个斜率分布函数的归一化系数，具体求法不再赘述，$f()$代表一个表示了NDF形状的一维函数。为什么上面形式的斜率分布函数具有形状不变性？ 根据形状不变性定义，法线分布函数 NDF 可视为二维斜率分布；原始 NDF 本质是三维分布。 对于具备形状不变形式的 NDF，对粗糙度$\alpha$做线性缩放，等价于在斜率空间中对整体分布做线性拉伸： 将粗糙度缩放$\lambda$倍，等价于将微表面沿  坐标轴同步拉伸$\lambda$倍，拉伸后微表面斜率变为$(\lambda\tilde{x},\lambda\tilde{y})$。 将缩放后的斜率与粗糙度代入斜率分布函数推导：  

$$
\begin{align*}
P^{22} \left( \lambda x_{\tilde{h}}, \lambda y_{\tilde{h}}, \lambda \alpha \right)
&= \frac{1}{(\lambda \alpha)^2} f\left( \frac{\sqrt{\lambda^2 x_{\tilde{h}}^2 + \lambda^2 y_{\tilde{h}}^2}}{\lambda \alpha} \right) \\
&= \frac{1}{\lambda^2 \alpha^2} f\left( \frac{\lambda \sqrt{x_{\tilde{h}}^2 + y_{\tilde{h}}^2}}{\lambda \alpha} \right) \\
&= \frac{1}{\lambda^2 \alpha^2} f\left( \frac{\sqrt{x_{\tilde{h}}^2 + y_{\tilde{h}}^2}}{\alpha} \right) \\
&= \frac{1}{\lambda^2} P^{22} \left( x_{\tilde{h}}, y_{\tilde{h}}, \alpha \right)
\end{align*}
$$

最后多出来的$\frac{1}{\lambda^2}$是二维平面的**面积缩放修正项， 保证分布全空间积分恒等于 1 ，**其余内部没有变化，证明微表面相对形态未发生改变。  

根据法线分布函数与斜率分布函数的关系可以将拥有形状不变性的法线分布函数写作：

$$D(h) = \frac{1}{\alpha^2 cos^\theta_h4} f\left( \frac{\tan\theta_h}{\alpha} \right) = \frac{1}{\alpha^2 cos^\theta_h4} f\left( \frac{\sin\theta_h}{\alpha cos\theta_h} \right)=\frac{1}{\alpha^2(n\cdot h)^4} f\left( \frac{\sqrt{1-(n\cdot h)^2}}{\alpha(n\cdot h)} \right)
$$



对于形状不变形的NDF可以通过粗糙度来控制表面的拉伸情况，下图所示：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782192572934-01d93b8f-fd95-4a4a-bcb9-5cf74d36744a.png)

对于形状不变的NDF，缩放粗糙度参数相当于通过倒数拉伸微观几何

形状不变性是一个法线分布函数NDF需要具备的重要性质。具有形状不变性的NDF，可以用于推导该函数的归一化的各向异性版本，并且可以很方便地推导出对应的遮蔽阴影项G。具备形状不变性的常用NDF为：GGX以及Beckmann，不具备形状不变性的NDF有Phong、Blinn-Phong、GTR，这也是为什么这些模型最终没有推广开来的原因。

:::



---



#### 各向异性（Anisotropy）NDF 
现实世界中，大多数材质具有各向同性的表面外观，但有些特殊材质的微观结构具有显著的各向异性(Anisotropy)，从而显著影响其外观。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782195645915-c45565a7-29ba-4a2c-8e23-5612f84cb634.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782195654016-2fd522a5-efc7-4a46-8fdc-35d4df252dbd.png)

创建各向异性NDF的常用方法是基于现有各向同性NDF进行推导。而推导所使用的方法是通用的，可以应用于任何形状不变的（shape-invariant）各向同性NDF，这便是GGX等形状不变的NDF能更加普及的另一个原因。

如上文所述，若一个各向同性（isotropic）的NDF具备形状不变性（shape-invariant），则其可以用以下形式写出：

$$D(h)=\frac{1}{\alpha_t \alpha_b(n\cdot h)^4} f\left( \frac{\sqrt{\frac{(t\cdot h)^2}{\alpha^2_t}+\frac{(b\cdot h)^2}{\alpha^2_b}}}{(n\cdot h)} \right)
$$

其中，参数$\alpha_t$和$\alpha_b$分别表示沿切线（tangent）方向$t$和副法线（binormal）方向$b$的粗糙度。若$\alpha_t=\alpha_b$，则上式缩减回各向同性形式。

下图就是一个各项同性的分布是怎么通过拉伸表面变成一个各向异性的分布的。相反的任何一个各向异性分布的结构可以变换回各项同性分布的结构。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782195937911-eda7eb56-2000-4a4b-90a4-6ad4053809cd.png)



---



##### Beckmann 分布 各向异性
Beckmann 分布函数是最符合这个形状不变性形式公式的，我们看各向同性的公式：

$$D(h) = \frac{1}{\pi \alpha^2 (n\cdot h)^4} e^{\left( -\frac{1-(n\cdot h)^2}{\alpha^2 (n\cdot h)^2} \right)}$$

我们直接比着葫芦画瓢就能直接得出 Beckmann 的各向异性版本：

$$D(h) = \frac{1}{\pi \alpha_t \alpha_b (n\cdot h)^4} e^{\left( -\frac{\frac{(t\cdot h)^2}{\alpha^2_t}+\frac{(b\cdot h)^2}{\alpha^2_b}}{(n\cdot h)^2} \right)}$$

其中，$h$为微表面法线（半角向量），$n$为宏观表面法线，$t$为切线方向，$b$为副法线方向，$\alpha_t$和$\alpha_b$分别表示沿切线方向$t$和副法线方向$b$的粗糙度。



---



##### GGX 分布 各向异性
我们首先把各向同性的 GGX 分布函数转化为形状不变性形式的公式：

$$\begin{align*}
D(h)&=\frac{\alpha^2}{\pi cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}\\
&=\frac{\alpha^4}{\pi \alpha^2 cos^4\theta_h(\alpha^2+tan^2\theta_h)^2}\\
&=\frac{1}{\alpha^2 cos^4\theta_h}\cdot \frac{\alpha^4}{\pi(\alpha^2+tan^2\theta_h)^2}\\
&=\frac{1}{\alpha^2 cos^4\theta_h}\cdot \frac{1}{\pi}\left(\frac{\alpha^2}{\alpha^2+tan^2\theta_h} \right)^2 \\
&=\frac{1}{ \alpha^2 cos^4\theta_h}\cdot \frac{1}{\pi}\left(\frac{1}{1+\frac{tan^2\theta_h}{\alpha^2}} \right)^2\\
&=\frac{1}{ \alpha^2 (n \cdot h)^4}\cdot \frac{1}{\pi}\left(\frac{1}{1+\frac{1-(n \cdot h)^2}{\alpha^2(n \cdot h)^2}} \right)^2
\end{align*}$$

现在符合形状不变性形式，我们只需要比着葫芦画瓢将其转换为各向异性版本即可：

$$\begin{align*}
D(h)&=\frac{1}{ \alpha_t\alpha_b (n \cdot h)^4}\cdot \frac{1}{\pi}\left(\frac{1}{1+\frac{1}{(n\cdot h)^2}(\frac{(t\cdot h)^2}{\alpha^2_t}+\frac{(b\cdot h)^2}{\alpha^2_b})} \right)^2 \\
&=\frac{1}{ \pi\alpha_t\alpha_b}\cdot \left(\frac{1}{(n \cdot h)^2+\frac{(t\cdot h)^2}{\alpha^2_t}+\frac{(b\cdot h)^2}{\alpha^2_b}} \right)^2
\end{align*}$$



---



### G：**几何函数(Geometry Function)**
实际上并不是所有微表面都能收到接受到光线，如下面左边的图有一部分入射光线被遮挡住，这种现象称为Shadowing。也不是所有反射光线都能到达眼睛，下面中间的图，一部分反射光线被遮挡住了，这种现象称为Masking。光线在微表面之间还会互相反射，如下面右边的图，一些被认为是shadowing部分的微表面会收到其他微表面反射的光，这可能也是一部分漫射光的来源，微表面理论忽略了这些相互反射。假如光线一直没出去反射，会造成一定的能量损失，后续会补充如何补齐这一块能量的方式(保持能量守恒)。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781891462214-22d55055-8c4a-4e08-9ab4-1181c5b8b4ac.png)

**几何函数**就是为了更好的模拟着色区域内微表面的凹凸不平而诞生的。

几何函数是保证 Microfacet BRDF 理论上能量守恒，逻辑上自洽的重要一环。其描述了微平面自阴影的属性，表示所有**微表面**中同时被入射方向和反射方向可见(没有被遮挡的)的比例，即**未被遮挡的微表面占所有微表面的百分比**。也就是说项计算出了真正能够有多少光到达观察方向。单纯的 NDF 数值不是有效的微表面的法线强度，需结合几何函数才能得到最终对 BRDF 能产生贡献的法线分布。

:::info
**遮蔽概率不变性(Masking Probability Invariance)**

基于形状不变性。下图展示了给定出射方向下的拉伸一维表面对于微表面遮蔽情况的影响，拉伸一维表面就像拉伸图片一样即一个维度被乘以一个恒定的系数。这一操作并不改变该表面的拓扑结构，当观察向量同样被拉伸后被遮挡的光线仍然被遮挡，未被遮挡的光线仍然未被遮挡。这是一个关键性质，后续会方便几何函数的推导。当中涉及的所有斜率同时被缩放时，遮挡概率对拉伸是保持不变的。这包括微表面的斜率和与出射方向相关的斜率。它们都被拉伸系数相反缩放因此斜率宽度的分布也同样反向拉伸了。相应的$D(h)$也会改变。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782198850208-c08392c8-07b1-4b23-afdd-9ec799844218.png)

:::

在之前的 NDF 介绍中，我们通过定义**遮蔽函数(masking function)**$G_1(h,v)$来对其最后可见性进行数学表达，其给出了沿着视图向量$v$可见的具有法线$h$的微表面的比率。$G_1(h,v)D(m)(v \cdot h)^+$在球体上的积分给出投影到垂直于$v$的平面上的微观表面面积，其等于投影到垂直于$v$的平面上的宏观表面面积，其中$+$表示为被约束为大于等于0，也就是说在这里剔除了背面的影响因为背面微平面不可见，因此在这种情况下不对其进行计算。

$$\int_\Omega G_1(h,v)D(h)(v·h)^+dh=v·n$$

基于物理的掩蔽函数$G_1(h,v)$应该总是满足这个上面这个式子，但是在这里需要对$G_1(h,v)$做一定的约束，这是因为$D(h)$没有完全指定微表面(microsurface)。$G_1(h,v)$仅告诉我们有多少百分比的微平面的法线指向了某些方向，而没有告诉我们这些法线是如何进行排列。而且对于固定的输出方向$v$，在二维中存在无限多个遮蔽函数$G_1(h,v)$满足等式。  
 

**微表面轮廓**

为了解决$G_1(h,v)$不能确定唯一形式的问题，在这里引入了第二个约束：选择合适的**微表面轮廓(microsurface profile)**，从而对决$G_1(h,v)$项进行具象化建模。一旦选择了微观表面轮廓，遮蔽函数就完全确定了，它的唯一形式可以被计算出。如下所示，微表面轮廓会对得出的BRDF形状有着很大的影响。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782276661230-0b3cc42e-c909-4018-ae20-42a9ec967633.png)

在这里有很多微表面轮廓模型，但是符合物理并且满足上述公式约束的遮蔽函数有**Smith 遮蔽函数**和**Torrance-Sparrow "V-cavity" function (V 型腔几何遮蔽函数)**

#### Smith 遮蔽函数
在真实的微表面中，是连绵起伏的山丘，一个点的高度和旁边的法线是有关联的（山顶法线朝上，山坡朝外），计算这种“关联表面”的遮挡概率，数学上极其复杂。如下图左图。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782737996864-4f6b6ba5-9b19-4243-ab74-aa8fe7647a43.png)

为了能算，Smith模型做出了一个**“无自相关”**的假设：把微表面想象成**无数根随机竖立的“针”或“碎片”**，它们的高度和朝向完全是独立的，跟邻居没有任何关系。如上图右图，虽然这看起来不像是真实的连续表面，但实践证明，用它算出来的光照结果视觉效果很好。

这个假设带来了一个神秘好处：法线和遮蔽脱钩，即**法线/遮蔽独立性(Normal/Masking Independence)。**因为是随机独立的，所以出现了一个关键性质：对于一个朝向你（没有被背面剔除）的微表面，它被远处其他微平面挡住的概率，跟它自己的法线方向没有任何关系。

意思就是说，如果一个表面法线朝向你的微表面，它被遮挡的概率与它的法线朝向没有关系；如果是背对你的法线的微表面（背面），它天然被自己挡住了，属于本地遮挡，与法线方向有关。

于是我们可以得到一个公式：

$G_1(v,h)=G^{local}_1(v,h)G^{dist}_1(v)$

左边$G_1(v,h)$指某个法线为$h$的微表面，在观察方向$v$下总共能被看见的概率。

右边第一项$G^{local}_1(v,h)=\chi^+(v,h)$指本地可见性，$\chi^+$是一个判断函数（要么为0要么为1），意思就是：如果你的法线朝向观察者，本地就没被自己挡住，记为1；否则背面不可见，记为0。

右边第二项$G^{dist}_1(v)$指远处遮挡概率，这一项只与观察方向$v$有关，与微表面法线$h$无关。

我们把这个公式代入到$\int_\Omega G_1(v,h)D(h)(v·h)^+dh=v·n$中得：

$$\int_\Omega G^{local}_1(v,h)G^{dist}_1(v)D(h)(v·h)^+dh=cos\theta_o$$

其中$G^{dist}_1(v)$与法线无关，在积分中可视为一个常数系数提取出来，然后把$G^{local}_1(v,h)$替换成$\chi^+(v,h)$：

$$G^{dist}_1(v)\int_\Omega \chi^+(v,h)D(h)(v·h)^+dh=cos\theta_o$$

由于这个方程是面向非背面法线的，所以$\chi^+(v,h)$可以直接剔除：

$$G^{dist}_1(v)\int_\Omega D(h)(v·h)^+dh=cos\theta_o$$

所以：

$$G^{dist}_1(v)=\frac{cos\theta_o}{\int_\Omega D(h)(v·h)^+dh}$$

远处遮挡的概率，等于‘宏观表面实际亮度’除以‘所有微平面朝观察方向的投影面积之和’。也就是说，**分母越大（微平面越“崎岖”），分母算出来的值越小，说明远处遮挡越严重**。

完整的$G_1(v,h)$方程如下：

$$G_1(v,h)=\chi^+(v,h)\frac{cos\theta_o}{\int_\Omega D(h)(v·h)^+dh}$$

这是Ashikhmin等人在法线、掩蔽相互独立的假设下剔除的准确遮蔽函数的积分形式。它们使用积分表示来预计算遮蔽函数，并且将它存储在一个查阅表中用来渲染。**Smith遮挡函数**通过将积分与从法向转换成斜率空间，可以将上面的式子重新改写成：

$$G_1(v,h)=\chi^+(v,h)\frac{1}{1+\Lambda(v)}=\frac{\chi^+(v,h)}{1+\Lambda(v)}$$

其中$\frac{1}{1+\Lambda(v)}$是 Smith 遮蔽函数的广义形式，是转换到斜率空间后的化简形式，对于许多随机曲面，其具有闭合形式的解。其中$\Lambda(v)$是表示微表面斜率上的积分：

$$\Lambda(v)=\frac{1}{cot\theta_o}\int^\infty_{cot\theta_o}(x_h-cot\theta_o)P^{22}(x_h)dx_h$$

Smith遮蔽函数针对每个NDF会计算出不同的$\Lambda(v)$函数。需要注意仅具有形状不变性的法线分布函数(如GGX、Beckmann)可以导出具有解析形式的$\Lambda(v)$函数，而且不具备形状不变性的函数(比如Blinn-Phong)，则$\Lambda(v)$不存在解析形式。

优点：Smith遮挡函数唯一满足其能量守恒并且满足法线/遮蔽独立的几何函数，选择它，**首先不是因为它像真实表面**，而是因为它在“法线/遮蔽独立”这个数学假设下，**数学上绝对精准且严格满足能量守恒**（不会出现反射光能量大于入射光的“永动机”情况）。

缺点：光线**垂直** 照向粗糙表面时，光线能射入凹坑底部，完美体现粗糙度；但当光线**几乎平行**（掠射）照向表面时，凸起的微表面会投射出长长的阴影，把凹坑全部盖住。此时光线只打在凸起的“光滑山顶”上，**粗糙度瞬间失效**，表面看起来异常光滑。因为它假设法线和遮挡位置无关，它无法准确模拟这种“光照角度剧烈改变粗糙度感知”的复杂耦合效应，导致掠射角下渲染结果偏暗或偏亮。

限制：Smith 假设表面是**完全随机** 的（像一堆散沙）。但布料有规律的经纬线编织、鳞片有规律的排列，这些属于**强自相关** 结构。一个凹坑旁边必有一个凸起，法线和位置强相关。在重复结构面前，Smith 的“独立性”假设彻底崩塌，算出来的结果会严重失真，所以 PBR 渲染布料时，往往要专门定制 NDF（如 Charlie 模型）和独立的遮蔽函数。

那么接下来还有问题需要解决，除了入射光会被遮挡以外，微表面产生的镜面反射光同样有可能被其它的微表面所遮蔽，导致其无法到达观察方向。也就是说在前面的基础上，还需要再考虑这个微表面产生的镜面反射光是否会被遮挡的情况。由于**光路是可逆的**，反射向相机的光被遮挡，同样可以看作是从相机射向微表面的光被遮挡。因此这种情况我们同样可以使用遮蔽函数$G_1(v,h)$来描述，其中$v$的值取反射光的方向即可。

#### Smith 联合遮蔽-阴影函数
**分离的遮蔽阴影函数**

当遮蔽函数$G_1(v,h)$的$v$取值为入射光方向时，描述的是微表面反射出去的光被其它微表面所遮挡导致无法接收到入射光，从而产生阴影的情况，此时遮蔽函数也可称为**阴影函数**。当遮蔽函数$G_1(v,h)$的$v$取值为反射光方向时，描述的是微表面产生的反射光被其它微表面所遮挡，无法射向相机的情况。可以使用一个函数来同时描述这两种情况，该函数被称为**联合遮蔽阴影函数(joint masking-shadowing function)**，常用$G_2$表示，取值范围为$[0,1]$。由于**光路可逆**，从相机方向看被挡住（遮蔽），等价于从光源方向看被挡住（阴影）。所以，完整的可见概率$G_2$必须**同时考虑视线方向**$v$**和光线方向**$l$，可得下式：

$$G_2(l,v,h)=G_1(l,h)G_1(v,h)=\frac{\chi^+(v,l)}{1+\Lambda(l)} \cdot\frac{\chi^+(v,h)}{1+\Lambda(v)}$$

这种被称为**分离形式** 的遮蔽阴影函数。如果使用该形式会导致得到的结果过暗。最极端的一个例子即是，假设光照方向和观察方向相同，即$l=v$，这意味着你盯着的那一面，光也正正好好从你眼睛的方向打过来。此时$G_1(v,h)=G_1(l,h)$。在现实中，只要这个微平面能被你看见，光就一定能原路照到它，没任何遮挡，理论上这种情况下应该为$G_2=G_1$，但这个公式得到的却是$G_2=G^2_1$，由于$G_1$小于1，平方后会更小。这就等于**把同一批遮挡物“双重计数”了**，导致渲染出的边缘和正面高光无故变暗，这就是图形学里常说的**“双重暗化（Double Darkening）”**问题。

**高度相关的遮蔽阴影函数**

一个更精确的遮蔽阴影函数需要对遮蔽和阴影之间的相关性进行建模，由于微表面的高度。直观地讲一个面在微表面的高度越高，在出射方向(无遮挡)和入射方向(无遮挡)的概率就会同时增加。因此遮蔽和阴影是通过微表面的升高而相互关联的。直观理解：**如果一个微平面凸起得够高，它在视线方向没被挡，那么在光线方向大概率也没被挡**（两者正相关）。这种相关性可以在以下的联合遮蔽阴影函数中得到说明：

$$G_2(l,v,h)=\frac{\chi^+(v,l)\chi^+(v,h)}{1+\Lambda(l)+\Lambda(v)}$$

去除了分离形式中的分母中的$\Lambda(l)\Lambda(v)$，当出射方向和入射方向相距较远时这种形式是准确的。但当方向接近时则同样会造成更暗的效果。**高度与分离形式计算复杂度几乎一样**（都是算两个$\Lambda$），但高度相关形式显著更准。推荐使用。

**方向相关的遮蔽阴影函数**

之前讲的“高度相关”只考虑了**微平面凸起的高度**（高的容易都看见，低的容易都挡掉）。但它忽略了一个**水平方向**的因素：如果**视线方向（$v$）**和**光源方向（$l$）** 在宏观法线$n$的**同一侧**（即方位角$\phi=0$），那么挡住视线的那个凸起，**必定也挡住光源**。这时候，两个方向的遮挡是“同一个人”造成的，**完全相关**。

在这种情况下，双重遮挡的概率不是相乘，而是取短板效应$G_2(l,v,h)=min(G_1(l,h),G_1(v,h))$（木桶原理，最窄的那一关决定了最终可见度）。如果视线和光源在**相反的两侧**，挡住它们的凸起大概率不是同一个，这时候遮挡就趋向于独立。

为了描述这种从“完全相关（同侧）”到“独立（异侧）”的渐变，给出了混合公式（分离形式和方向形式）：

$$G_2(l,v,h)=\lambda(\phi)G_1(l,h)G_1(v,h)+(1-\lambda(\phi))min(G_1(l,h),G_1(v,h))$$

其中$\lambda(\phi)$函数值的范围为$[0,1]$，并且其值随着$v$和$l$的相对方位角$\phi$的增加而增加(也可写作$\lambda(l,v)$)，目前常用的函数有如下两种：

$$\lambda(\phi)=1-e^{-7.3\phi^2}$$

$$\lambda(\phi)=\frac{4.41\phi}{4.41\phi+1}$$

但是$\lambda(\phi)$是类似于Ginneken等人的经验模型。没有找到函数的Smith解析表达式，只是长得像Smith，所以必须分别计算遮蔽和阴影。 这就是为什么必须混合可分离的形式和方向相关的形式，并且无法将高度相关性结合到他们的模型中。

**高度方向相关的遮蔽阴影函数**

将高度相关与方向相关的函数结合，即可得到**高度方向相关的遮蔽阴影函数**。其中Smith高度方向相关的遮蔽阴影函数如下所示：

$$G_2(l,v,h)=\frac{\chi^+(v,l)\chi^+(v,h)}{1+max(\Lambda(v),\Lambda(l))+\lambda(l,v)min(\Lambda(v),\Lambda(l))}$$

**极端情况 1：视线和光源完全重合（$\lambda=0$）**  
分母变成$1+max(\Lambda(v),\Lambda(l))$。因为两个方向一样，$\Lambda$值也一样，分母就是$1+\Lambda$。这正好还原成了单个方向的$G_1$（即$G_2=G_1$），**彻底解决了双重暗化问题。**

**极端情况 2：视线和光源方向差异极大（$\lambda$趋向于 1）**  
分母变成$1+max(\Lambda(v),\Lambda(l))+min(\Lambda(v),\Lambda(l))$，也就是$1+\Lambda(l)+\Lambda(v)$。这正好还原成了我们上面讲的 **“高度相关形式”**（分母相加）。

**中间情况（$\lambda$在 0 到 1 之间）**  
分母在“只取最大值”和“两者相加”之间**平滑插值**。

#### 不同 NDF 下的几何函数
##### Beckmann-Smith阴影遮蔽函数
我们之前求到过Beckmann的斜率分布函数

$$P^{22}(\tilde{x},\tilde{y})=\frac{1}{\pi\alpha^2}e^{\left(-\frac{\tilde{x}^2+\tilde{y}^2}{\alpha^2} \right)}=\frac{1}{\pi\alpha^2}e^{\left(\frac{-tan^2\theta_h}{\alpha^2} \right)}
$$

再通过$\Lambda$函数的定义，可以得出Beckmann的$\Lambda$函数如下所示：

$$\Lambda(a)=\frac{erf(a)-1}{2}+\frac{1}{2a\sqrt{\pi}}e^{-a^2}$$

其中$a=\frac{1}{tan\theta\alpha}$。这个公式的计算成本很高，因为它包含$erf$(误差函数)，它是高斯函数积分的“标准答案”，在数学上很完美，在 GPU（显卡）里，计算$erf$需要做复杂的级数展开和迭代循环，这个计算代价比普通的加减乘除要高出几十倍。如果在每个像素点的渲染中都要算一次$erf$，游戏帧率会直接“卡成幻灯片”。因为这个原因，通过用近似表示：

$$\Lambda(a) \approx 
\begin{cases} 
\frac{1 - 1.259a + 0.396a^2}{3.535a + 2.181a^2}, & a < 1.6 \\ 
0, & a \geq 1.6 
\end{cases}$$

后续可以计算出对应的$G_2$，这里暂时不计算了。

##### GGX-Smith阴影遮蔽函数
根据我们之前求得到的GGX NDF可以简单得到它的斜率分布函数：

$$P^{22}(\tilde{x},\tilde{y})=\frac{\alpha^2}{\pi(\alpha^2+tan^2\theta_h)^2}=\frac{\alpha^2}{\pi\alpha^2(1+\frac{\tilde{x}^2+\tilde{y}^2}{\alpha^2})^2}$$

再通过$\Lambda$函数的定义，可以得出GGX的$\Lambda$函数如下所示：

$$\Lambda(a)=\frac{-1+\sqrt{1+\frac{1}{\alpha^2}}}{2}$$

其中$a=\frac{1}{tan\theta\alpha}$，所以：

$$\Lambda(v)=\frac{-1+\sqrt{1+\alpha^2tan^2\theta_o}}{2}$$

$$\Lambda(l)=\frac{-1+\sqrt{1+\alpha^2tan^2\theta_i}}{2}$$

可以接下去继续推算$G_2$，代入到高度相关的Smith遮蔽阴影函数当中。

$$\begin{align*}
G_2(l,v)&=\frac{1}{1+\Lambda(v)+\Lambda(l)}\\
&=\frac{1}{1+\frac{-1+\sqrt{1+\alpha^2tan^2\theta_o}}{2}+\frac{-1+\sqrt{1+\alpha^2tan^2\theta_i}}{2}}\\
&=\frac{2}{\sqrt{1+\alpha^2tan^2\theta_o}+\sqrt{1+\alpha^2tan^2\theta_i}}\\
&=\frac{2}{\sqrt{1+\alpha^2\frac{1-cos^2\theta_o}{cos^2\theta_o}}+\sqrt{1+\alpha^2\frac{1-cos^2\theta_i}{cos^2\theta_i}}}\\
&=\frac{2cos\theta_ocos\theta_i}{cos\theta_i\sqrt{cos^2\theta_o+\alpha^2-\alpha^2cos^2\theta_o}+cos\theta_o\sqrt{cos^2\theta_i+\alpha^2-\alpha^2cos^2\theta_i}}\\
&=\frac{2cos\theta_ocos\theta_i}{cos\theta_i\sqrt{(1-\alpha)cos^2\theta_o+\alpha^2}+cos\theta_o\sqrt{(1-\alpha)cos^2\theta_i+\alpha^2}}
\end{align*}$$

上诉式子即：GGX使用Smith高度相关的遮蔽阴影函数公式。此时的$G$项计算非常的复杂，注意到平方根下的所有项都是平方，并且所有项都在$[0,1]$范围内之后，可以通过简化公式来获取一个近似值，简化后的公式如下：

$$\begin{align*}
G_2(l,v)&=\frac{2cos\theta_ocos\theta_i}{cos\theta_i((1-\alpha)cos\theta_o+\alpha)+cos\theta_o((1-\alpha)cos\theta_i+\alpha)}\\
\end{align*}$$

分离形式（Schlick近似形式）的$G_2$就不再计算了，直接给出结果：

$$\begin{align*}
G_2(l,v)
=\frac{2cos\theta_o}{cos\theta_o+\sqrt{cos^2\theta_o+\alpha^2(1-cos^2\theta_o)}} \cdot \frac{2cos\theta_i}{cos\theta_i+\sqrt{cos^2\theta_i+\alpha^2(1-cos^2\theta_i)}} 
\end{align*}$$



##### GGX的各种近似
**Smith-Schlick-GGX**

对于分离形式的，Christophe Schlick在1994年提出了一种极快的公式替代$\frac{x}{x(1-k)+k}$来替代复杂的$G_1$函数，被称为**Schlick近似形式**：

$$\begin{align*}
G_2(l,v)
=\frac{cos\theta_o}{k+cos\theta_o(1-k)} \cdot \frac{cos\theta_i}{k+cos\theta_i(1-k)} 
\end{align*}$$

其中$k$是一个与粗糙度有关的拟合系数，越粗糙，所以$k$也就越大，那么$G_2$衰减越快。

我们会在计算直接光和间接光的时候使用不同的$k$，常用的$k$有：

直接光$k=\frac{(\alpha+1)^2}{8}$，间接光$k=\frac{\alpha^2}{2}$，$\alpha=roughness^2$

**Smith-Joint-Schlick-GGX**

对于高度形式，Heitz在2014年基于Schlick近似提出了Joint（联合的概念），将游戏和电影业界对遮蔽阴影函数（The Smith Joint Masking-Shadowing Function）的理解上升到了一个新的层次。

UE和Unity都在后续更新中转向了Smith联合遮蔽阴影函数（The Smith Joint Masking-Shadowing Function）的高度相关遮蔽阴影形式（Height-Correlated Masking and Shadowing），并相应地都做了一些近似与优化。

其中UE和URP中使用的：

$$\alpha=roughness^2$$

$$\Lambda(v)=cos\theta_i(cos\theta_o(1-\alpha)+\alpha)$$

$$\Lambda(l)=cos\theta_o(cos\theta_i(1-\alpha)+\alpha)$$

$$G_2(l,v)=\frac{0.5}{\Lambda(v)+\Lambda(l)}$$

结合起来：

$$G_2(l,v)=\frac{0.5}{cos\theta_i(cos\theta_o(1-\alpha)+\alpha)+cos\theta_o(cos\theta_i(1-\alpha)+\alpha)}$$

这里有点误导的是，这里求的$G_2$并不是$G_2$，而是$V_2$，其值为$\frac{G_2}{4cos\theta_icos\theta_o}$

我们求得的这个$G_2$可以直接$f_{spec}=DFG$

**各向异性版本**

$$\alpha_t=roughness_t^2$$

$$\alpha_b=roughness_b^2$$

$$\Lambda(v)=cos\theta_i \sqrt{cos^2\theta_o(\alpha_tcos^2\theta_t+\alpha_bcos^2\theta_b)+cos^2\theta_o}$$

$$\Lambda(l)=cos\theta_o \sqrt{cos^2\theta_i(\alpha_tcos^2\theta_t+\alpha_bcos^2\theta_b)+cos^2\theta_i}$$

$$G_2(l,v)=\frac{0.5}{\Lambda(v)+\Lambda(l)}$$

#### V-Cavity（**V 型腔几何遮蔽函数**）
V-Cavity模型最初的想法是通过若干不同尺度的V型表面来近似渲染材质，这个模型不是用法线分布来模拟一个微表面上的散射而是计算不同微表面上的散射并平均它们的贡献。如下图所示：

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782757318029-327daa96-ca3d-4215-8051-d1fed3849b71.png)

但是现在V-Cavity遮蔽函数用来的很少，大多数还是用的上面讲的Smith模型，虽然V-Cavity的可见法线的分布在数学上有很好的定义。 但它在物理上是不可行的，它所模拟的是一个非现实的入射角下的表面轮廓。

有两种法线：一种是背向的法线会被去除；另一种是不背向的法线，产生一个由$D(h)cos\theta_h$加权的辐射度贡献。因此在投射到出射方向之前，微表面的权重完全如同它们投射到几何表面上一样。因此模拟的是一个几何上平坦的微表面：微表面可以扰动光的反射，但它们在几何上并不存在。因此这种微表面模型是不现实的，**因为它的行为更像法线图而不是位移图**，如下图所示。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782758476740-baf4934d-5af2-40ff-bb05-8fa60b57dca7.png)

对于单个微表面来说，高度可见的法线会比不太可见的法线占据更多的投影面积，因此有更高的贡献。然而这种情况不会发生在V-Cavity中，因为不同的法线是单独模拟的，并根据法线的分布进行加权。在加权中没有**视图依赖性**(除了背向法线被丢弃)。这就是为什么V-Cavity没有很好地纳入可见度的影响，而最终模拟的东西接近于法线图。

在掠射角（视线几乎贴着表面）下，真实的粗糙表面会因为凸起的遮挡，反射峰值会向视线方向偏移（即“偏移效应”）。但 V-Cavity 因为把每个微平面都当成“平等投影面积”来平均，**导致 BRDF 的峰值强度过低，并且反射方向没有发生应有的偏移**，看起来就像一张只会变颜色、但不会因为角度变化而产生立体凹凸感的“法线贴图”。

下图显示了由各向同性的Beckmann产生的BRDFs，其中有V-Cavity和Smith掩蔽阴影函数产生的BRDF，以及从一个程序化随机微表面模型散射的数值模拟中计算出来的结果。可以看到在Smith掩蔽阴影函数下，随着粗糙度的增加，分布向出射方向移动。对于非常高的粗糙度值BRDF甚至主要是反向散射。这种效应是可以预期的，因为面向出射方向的法线是最明显的。相比之下这种效应并没有出现在 从V-Cavity模型中没有出现。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782758632335-ff097bc5-be73-418c-a1a3-2c26c7aa3c54.png)

### F：菲涅耳反射(Fresnel Reflectance)
#### 菲涅耳效应
**菲涅耳效应(Fresnel effect)** 作为基于物理的渲染理念中的核心理念之一，表示的是看到的光线的反射率与视角相关的现象，由法国物理学家奥古斯丁·让·菲涅耳（Augustin-Jean Fresnel）率先发现。其具体表现是在掠射角(与法线呈接近90度)下光的反射率会增加。而上述的反射率，便被称为菲涅耳反射率。如下图。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782758789777-7f144115-2396-4952-92fe-f510207f895a.png)

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782758800600-427809bc-16be-4f0c-9682-9f6652ef1c38.png)

下图也是一个菲涅耳效应的经典范例，垂直看向水面和在远处斜视水面，水面反射的光强是不同的。垂直看水面能够看清水下的情况，但是近乎平行的看向水面，反而反射特别的强烈。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782758833112-ec169f83-5fc0-4696-8ca2-2cf4c07951d2.png)

需要注意的是**我们在宏观层面看到的菲涅尔效应实际上是微观层面微平面菲涅耳效应的平均值。**

也就是说，影响菲涅耳效应的关键参数在于**每个微表面的法线和入射光线的角度**，而不是宏观平面的法线和入射光线的角度。即：

+ 当从接近平行于表面的视线方向进行观察，所有光滑表面都会变得100%的反射性。
+ 对于粗糙表面来说，在接近平行方向的高光反射也会增强，但不够达到100%的强度。

并且材质的种类会影响菲涅耳效应的强弱，**金属的菲涅耳效应相对较弱**，因为其正常情况下的反射率就很高，并且随角度变化很小，对于非金属则相反，非**金属的反射率平时就较低，在表面法向量方向的反射率仅为4%（介电质反射率）**，但当视线与表面法向量夹角很大的时候，在菲涅耳效应的作用下反射率可以接近100%，这一现象也导致了金属与非金属外观上的不同。

#### **菲涅耳方程(Fresnel Equations)**
物体的表面是周围介质(通常是空气)和物体材质之间的交界面。光与两种物质之间的平面的相互作用遵循由奥古斯丁·让·菲涅耳提出的**菲涅耳方程(Fresnel Equations)。**

菲涅耳方程用来描述光在不同折射率的介质之间的行为的方程，菲涅耳方程能解释反射光的强度、折射光的强度、相位与入射光的强度的关系。

对于一个给定的物质，菲涅尔方程可以理解为一个反射率函数$F(\theta_i)$，只依赖了入射光角度。原则上$F(\theta_i)$的值在可见光谱是连续变化的。出于渲染目的，**它的值被当作一个RGB向量**。函数$F(\theta_i)$有以下特征：

+ 当$\theta_i=0°$，光线垂直于表面入射也就是光线方向等于法线方向$l=n$，此时$F(\theta_i)$的值$F_0$可以被认为是物质特有的镜面反射颜色。这种情况被称为**法线入射(normal incidence)，**$F_0$被称为** 0 度角入射的菲涅尔反射值。**
+ 随着$\theta_i$的增加,光线射向表面的掠射角(glancing angles)逐渐增加，$F(\theta_i)$的贡献就会越明显，在$\theta_i=90°$的时候达到1(白色)。

:::info
简单来讲菲涅耳方程：

描述了物体表面在不同入射光角度下反射光线所占的比率。

光线以不同角度入射会有不同的反射率。相同的入射角度，不同的物质也会有不同的反射率。

:::

下图展示了几种物质的$F(\theta_i)$函数的可视化形式。曲线是高度非线性的，直到$\theta_i=75°$，值都几乎没有改变，但是会快速到1。从$F_0$到1的增长大部分是单调的，尽管一些物质(如图中的铝)在变白之前有轻微的下降。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782759648363-e287a7f7-7683-474f-9387-a5557e59c04c.png)

在镜面反射中，出射角的大小和入射角一样。 这意味着入射光线以**掠射角** 到达表面——随着$\theta_i$接近90°，同样会以掠射角抵达眼睛。 因此，**反射率的增加主要体现在物体的边缘**。可以从下图中体现。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782759716278-2a12580f-862a-4d95-bf90-85b56f16282b.png)

##### Schlick 菲涅耳近似等式
完整的菲涅耳方程是十分复杂的，除了菲涅耳方程的复杂性，菲涅耳方程还有其他的特性，这使得在渲染中很难直接使用它们。Schlick给出了菲涅耳反射率的近似值如下所示：

$$F_{Schlick}(v,n)=F_0+(1-F_0)(1-v·n)^5$$

其中$F_0$即 0 度角入射的菲涅尔反射值，$v$是视角方向，$n$是法线方向。

在PBR中，我们通常使用微表面法线，也就是半角向量$h$：

$$F_{Schlick}(v,h)=F_0+(1-F_0)(1-v·h)^5$$

这个函数是在白色和$F_0$之间进行RGB插值。尽管很简单，但还是相当准确的。下图是**实线表示完整的菲涅耳方程，虚线表示Schlick的近似。**

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782760009880-bfb3e259-e355-4409-8777-07dfb3af47f8.png)

上图包含几种与Schlick曲线差距挺大的材质，在转为白色之前表现出明显的 "凹陷"。事实上最下面一行的物质被选中是因为它们与Schlick近似值的偏差特别大。即使对这些物质来说产生的误差也是相当微妙的。在少数情况下可以使用Gulbrandsen给出的另一种近似方法，该方法对精确捕捉此类材料的行为非常重要。这个近似值可以实现与金属的完整菲涅尔方程的较好匹配，尽管它比Schlick的方程在计算上更加昂贵。一个更简单的选择是修改Schlick的近似方法，允许将最后一项提高到5以上的指数。这将改变$90°$处向白色过渡的 "尖锐性"。这可能会导致更接近的匹配。

当使用Schlick近似时，$F_0$是控制菲涅耳反射率的唯一参数。这很方便因为$F_0$有一个定义明确的有效值范围$[0,1]$，很容易用标准的颜色选择界面来设置，并且可以用为颜色设计的纹理格式来制作纹理。此外$F_0$的参考值可用于许多实际材料中。折射率也可以用来计算。通常假设$n _1=1$，这是空气折射率的近似值，用$n$代替$n_2$来表示物体的折射率。这种简化给出了以下方程：

$$F_0 =\left(\frac{n-1}{n+1} \right)^2$$

这个方程甚至适用于复数折射率(如金属折射率)。折射率在可见光谱上有显著变化的时候，精确计算$F_0$的RGB值首先要求计算$F_0$需在波长的密集处进行采样，然后将得到的光谱向量转换为RGB值。

**在一些应用中， Schlick近似更一般的形式为：**

$$F_{Schlick}(v,n)=F_0+(F_{90}-F_0)(1-v·n)^{\frac{1}{p}}$$

这提供了对菲涅尔曲线在$90°$时过渡到的颜色的控制以及过渡的"锐度，使用这种更普遍的形式通常是出于增加艺术控制的成分。但在某些情况下，它也可以帮助匹配物理现实。正如上面所说的，修改方程中指数可以使某些材质变得更为适合。此外将$F_{90}$设置为白色以外的颜色可以帮助匹配菲涅尔方程不能很好描述的材质，例如被细小灰尘覆盖的表面。



---



# PBR工作流
工作流中的核心内容便是贴图，不论是UE4还是Unity都支持将PBR的参数以贴图的形式传入引擎，我们可以根据一个物体同一mesh或不同mesh的不同区域的属性差异来控制贴图上的属性产生不同，而没有贴图的话，一个物体只能使用一种参数属性。

美术制作的albedo纹理一般都是sRGB空间的，因此我们要先转换到线性空间再进行后面的计算。根据美术资源的不同，AO纹理也许同样需要从sRGB转换到线性空间

<!-- 这是一张图片，ocr 内容为： -->
![两种工作流的贴图差异及一些公共贴图](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781983727130-26f2c6e0-719b-47bd-ba10-6038240cb9d5.png)

## Metallic/Roughness工作流-金属度/粗糙度
该工作流是PBR工作流中最为通用的。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984078471-ccd291cb-cd08-43be-ac38-dd31bcec052b.png)

该工作流被定义为一组贴图通道，通道作为纹理被送入着色器的采样器里。M-R工作流的特定贴图有基色（BaseColor）、金属度（Metallic）和粗糙度（Roughness）。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984102619-e94f987c-b9af-46a2-a62e-f0623367377f.png)

PBR着色器还将会利用到环境光遮蔽（AO）、法线（Normal）和高度（Height）贴图进行视差映射等。

**Base Color基色贴图**

RGB-sRGB：表示贴图为RGB三色贴图，在sRGB空间

基色贴图保存了金属的反射率和非金属的漫反射颜色，包含RGB三通道。如果某一区域在金属贴图中表示为金属，就取其作为反射率值，否则取其作为反射波长颜色。也就是金属部分的$F_0$与漫反射项中的$\rho$

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984179501-124514b0-04d7-4dbd-a6e3-0422adced812.png)

+ 贴图颜色代表非金属的反射颜色和金属的反射率值。
+ 除了微遮挡外，基色不应该包含照明信息。
+ 暗值不应低于30 sRGB（可容忍范围） - 50 sRGB（严格范围）。
+ 亮值不应超过240 sRGB。
+ 原始金属的反射率很高，在70-100％范围内，我们可以将其映射到180-255 sRGB。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984484817-36b82a23-6400-446d-8177-28118b7f9303.png)

**Metallic金属度贴图**

GrayScale - Linear 灰度图，在线性空间

金属度贴图就像一个Mask（遮罩），告诉着色器如何使用在Base Color中采样的数据(采用金属or非金属的计算)。**在金属度贴图中，0.0(黑色0sRGB)表示非金属，1.0(白色255 sRGB)表示金属。** 着色器采样到白色时就会将Base Color中的对应区域作为金属反射率值对待。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984599453-bf43d493-97b9-4434-a055-d5c3031ec067.png)

+ 金属度图完全可以做成一张非零即一的黑白图，允许极少量两头极端范围内的过度值存在
+ 金属值应在235-256 sRGB，它们的基色贴图值应该在180-255 sRGB范围内
+ **生锈的、被灰尘覆盖的金属，金属度贴图可以表示非金属和金属之间的混合状态，但如果值低于235 sRGB，基色中的值也需要降低。**
+ 理论上不应出现大面积的位于中间范围的金属值，那样做是错误的，现实不存在这种材料，但是强行为了特殊效果亦可。

**Roughness粗糙度贴图**

GrayScale - Linear 灰度图，在线性空间

Roughness贴图描述了表面不规则性也就会影响Diffuse和Specular的占比。描述过反射方向将根据表面粗糙度随机变化。光向变了但总光强不变。粗糙的表面会有较大的、看起来较暗的高光。较光滑的表面会保持镜面反射集中，即使反射的光总量相同，也会显得更亮或更强烈。**在Roughness贴图中，黑色(0.0)表示光滑表面，白色(1.0)表示粗糙表面。**

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984701410-02d7bb12-38d8-4c32-afb1-f8641fca79a7.png)

**M-R工作流的缺陷**

M-R工作流的一个缺陷就是它会产生白色边缘的伪影，这个边缘是由于插值造成的，在材料之间的过渡区域是很明显的，在这里，电介质材料和非常明亮的金属之间存在着鲜明的对比。这个问题在S-G工作流也存在但是几乎不可见而且是黑色的伪影。这个现象在材料的过渡区域很明显，因为这一部分从非金属变成了非常亮的金属。S-G工作流中漫反射贴图金属为黑色因此产生了较黑的伪影。

<!-- 这是一张图片，ocr 内容为： -->
![M-R工作流下的伪影](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984910805-236581d1-be3e-4cdd-9749-c9cd497091d7.png)

<!-- 这是一张图片，ocr 内容为： -->
![S-G工作流的偏黑边缘](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781984990678-6c0e428b-ad02-4230-bb29-68aeee04f123.png)

贴图分辨率和纹素密度对边缘伪影的可见性有直接影响。 例如，如果用硬边刷来创建金属和非金属之间的过渡区域，则低分辨率会使边缘变软，从而加剧伪影。 这种低分辨率问题也是由未按比例缩放以提供足够的纹理像素密度的UV引起的。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1781985038788-65470056-e9b0-421e-b4a9-ba00076c5a9a.png)

贴图分辨率会影响M-R工作流中可能出现的白边。 确保UV提供足够的密度以匹配分辨率，以最大限度地减少伪影。

**优点**

+ 更容易创作，不容易因为提供错误的F0而导致结果错误(specular过亮)。
+ 纹理占用内存少，因为 Metallic 和 Roughnesss 贴图都是灰度图(单通道)。
+ 更广泛被使用

**缺点**

+ 不能控制非金属的$F_0$，大多数直接使用0.04代替。
+ 边缘伪影更明显，特别是在低分辨率下。

### 渲染方程
理解完上面的 M-R 工作流的概念，可以得出实时渲染中 M-R 工作流的PBR方程是这样的：

$$L_o=\int_\Omega f_rL_icos\theta_id\omega_i=\int_\Omega(k_d\frac{\rho}{\pi}+k_s\frac{DG}{4cos\theta_icos\theta_o})L_i cos\theta_i d\omega_i$$

其中，$k$代表“分配系数”或“权重”，它唯一的作用就是**保证能量守恒**——即把入射光的能量合理地分配给“漫反射”和“镜面反射”这两个过程，防止反射出去的总能量超过入射光能量。

$k_s$**表示镜面反射权重：**

在早期的经验模型中，需要用一个固定的$k_s$来控制高光强度。但F在你给的**基于物理的渲染（PBR）**中，$k_s$被干掉了，原因在于：

+ **菲涅尔项**$F$**本身就是一个动态的“镜面反射比例”**。它告诉你：当光线垂直照射时，反射率很低（约4%）；当光线掠射时，反射率接近100%。
+ 既然$F$已经精确计算出了“有多少光被镜面反射了”，那么人为再乘一个固定的$k_s$就是多余的。因此，**把$k_s$直接设为 1**（即去掉它），由$F$全权负责镜面反射的权重。

故$k_s=F$

$k_d$**表示漫反射权重：**

既然镜面反射走了$F$比例的能量，那么剩下的能量理论上可以用于漫反射。但这里还有一个更关键的物理事实：**金属没有漫反射**。

因此，$k_d$的计算必须同时考虑两个因素：

+ **非金属（电介质）部分**：扣除掉被镜面反射走的能量，剩下$1-F$可以用于漫反射。
+ **金属部分**：因为金属几乎不产生漫反射，所以我们要把金属度（metallic）考虑进去，彻底砍掉金属的漫反射贡献。

故$k_d=(1-F)(1-metallic)$

所以，最后的渲染方程可以统合成：

$$L_o=\int_\Omega((1-F)(1-metallic)\frac{\rho}{\pi}+\frac{DFG}{4cos\theta_icos\theta_o})L_i cos\theta_i d\omega_i$$

一般我们在游戏引擎中使用时, 往往会把漫反射中的$1-F$项忽略。因为当$F$的值比较大的时候，都是在边缘区域，这时镜面反射很强，漫反射的强度相对很弱，完全可以直接忽略。忽略漫反射中的$1-F$项，可以为全局光照等的计算带来极大的便利。这样我们最终的渲染方程为：

$$L_o=\int_\Omega((1-metallic)\frac{\rho}{\pi}+\frac{DFG}{4cos\theta_icos\theta_o})L_i cos\theta_i d\omega_i$$



## Specular/Glossiness工作流-高光度/光泽度
我习惯上把 Glossiness 光泽度称作为 Smoothness 光滑度

**M-R 工作流**通过“金属度”这个开关，将材质分为“金属”和“非金属”两大类，自动化处理了复杂的菲涅尔效应，优点是**简单、物理正确**。

而 **S-G 工作流**则将材质属性（如高光颜色和强度）的控制权完全交给了美术师。它提供了前所未有的**灵活性**，但也要求使用者对PBR原理有更深的理解，以避免创造出能量不守恒的“物理不正确”材质。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782015096348-4f1c8e7e-2f4c-4312-a17a-fb5412522a57.png)

该工作流也被定义为一组贴图通道。S-G 工作流的特定贴图有漫反射（diffuse）、镜面反射（specular）、光泽度（glossiness）贴图。（这里的漫反射和镜面反射和传统渲染流程里的贴图不同）。PBR着色器也将会利用到环境光遮蔽（AO）、法线（Normal）和高度（Height）贴图进行视差映射等。

**Diffuse 基色贴图**

RGB-sRGB：表示贴图为RGB三色贴图，在sRGB空间

基色贴图保存非金属的反射颜色，包含RGB三通道。但它不包含任何反射值，因此金属区域将是黑色（0.0）。该贴图色调指南和 M-R 的 BaseColor 相同，但是金属值为0.0纯黑色，不需要受暗部范围的约束。

sRGB三色图，包含非金属的反射颜色，即漫反射项中的C。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782015218827-5e966644-17fc-4172-9525-bb2d264d3176.png)

+ **颜色表示非金属材料的反射颜色和原始金属的黑色（0.0）。**
+ 除了微遮挡外，基色应该没有照明信息。
+ 暗值不应低于30 sRGB（容差范围） - 50 sRGB（严格范围），原始金属的黑色除外。
+ 亮值不应超过240 sRGB。

**Specular 反射贴图**

RGB-sRGB：表示贴图为RGB三色贴图，在sRGB空间

Specular贴图定义了金属和非金属的$F_0$值。这和 M-R 工作流不同，因为 M-R 工作流把非金属F0规定为了4%(0.04)，并且只能通过SpecularLevel节点修改。其实$F_0$应该也来源真实世界的测量值。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782015349426-e96ec3df-f5ea-4394-addc-69aaee81c0b3.png) 
金属表面的灰尘or生锈应该降低反射贴图的反射率值并且提高基色中的颜色值（不再是金属）。非金属一般$F_0$设置为0.02-0.05，对应sRGB范围为40-75 sRGB。如果找不到材料特定的$F_0$值，就用0.04代替。宝石是个例外，它的F0在0.05-0.17范围内。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782015677805-643270ff-6904-4276-89cb-e022c266092f.png)

+ **镜面反射贴图包含非金属的**$F_0$**和原始金属的反射率值。**
+ **非金属反射的光量比金属少。 普通非金属的**$F_0$**值约为0.02-0.05。sRGB值应介于40-75之间，其重叠范围为0.02-0.05（线性）。**
+ 常见的宝石在0.05-0.17（线性）范围内。
+ 普通液体在0.02-0.04（线性）范围内。
+ 原始金属的反射率值将在70-100％镜面反射率范围内，映射到180-255 sRGB。
+ 如果找不到特定材料的IOR（折射率）值，则可以使用0.04（0.04 - 塑料）。

**Glossiness 光泽度贴图**

GrayScale - Linear 灰度图，在线性空间

和M-R工作流中粗糙度相反，0.0表示粗糙，1.0表示光滑表面。



**优点：**

+ 边缘伪影不明显 
+ 可自己控制非金属$F_0$值

**缺点：**

+$F_0$可能用错从而导致破坏PBR原则 
+ RGB 贴图多，占用内存多



### 渲染方程
在 S-G 工作流中由于没有了金属度的概念，所有细节的调节全依靠美术对贴图的把握，所以渲染方程去除了金属度：

$$L_o=\int_\Omega(\frac{\rho}{\pi}+\frac{DFG}{4cos\theta_icos\theta_o})L_i cos\theta_i d\omega_i$$



---

## 工作流转换
**S-G 到 M-R 的转换**

1. 依靠金属与非金属在diffuse和specular的差异获得一张Metallic贴图（金属在diffuse是黑的）
2. 以 Metalic 图作为遮罩对 Specular 处理，得到金属的反射率$F_0$值
3. 覆盖到原本的 diffuse（diffuse + 金属$F_0$= BaseColor）

**M-R 到 S-G 的转换**

1. 使用 Metallic 图作为遮罩，对 BaseColor 处理，提取 BaseColor 中的金属部分，剩余的部分覆盖56度灰(0.04)，得到 Specular 贴图
2. 使用 Metallic 图作为遮罩，对 BaseColor 处理，将金属部分抠去，得到 Diffuse 贴图



---

## 工作流常用的其他通用贴图
**环境光遮蔽 AO 贴图**

AO贴图定义了表面点可访问到的周围的环境光量，**它只影响漫反射结果，不遮挡镜面反射。**

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782016100402-801422e8-1b02-474d-9a99-50a3a2a41ad2.png)

某些引擎可以用屏幕空间反射来模拟局部反射，即屏幕空间下的环境光遮蔽（SSAO）

**高度贴图 Height**

高度图在渲染中可用于视差映射，为凹凸/法线贴图额外提供了更明显的深度，增强真实性。

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/61442912/1782016580818-13c98d2f-94ec-4649-8946-22c535a607fb.png)

**法线贴图 Normal**

法线贴图用于模拟表面细节，在PBR和非PBR工作流中用法相同。

不再多说



---



:::info
参考文章：

[链接PBR公式推导以及理论梳理](https://zhuanlan.zhihu.com/p/606407173)

[深入DFG项](https://zhuanlan.zhihu.com/p/611622351)

[PBR工作流对比](https://zhuanlan.zhihu.com/p/80784757)

[法线分布函数相关总结——毛星云](https://zhuanlan.zhihu.com/p/69380665)

[BRDF理论中的斜率空间](https://zhuanlan.zhihu.com/p/594965371)

[所有讲述斜率空间的英文原文](https://www.reedbeta.com/blog/slope-space-in-brdf-theory/#slope-space)

以及大D老师的指导

:::

